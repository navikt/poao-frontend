import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { Request, Response } from 'express';
import { gcsRoute } from './gcs-route.js';
import { FallbackStrategy } from '../config/base-config.js';
import { JsonConfig } from '../config/app-config-resolver.js';

// Use vi.hoisted to properly hoist mock variables
const { mockCacheGet, mockCacheSet, mockCacheFlushAll, mockBucket } = vi.hoisted(() => {
    const mockFileDownload = vi.fn();
    const mockBucketObj = {
        file: vi.fn((path: string) => ({
            download: mockFileDownload
        })),
        _mockFileDownload: mockFileDownload
    };

    return {
        mockCacheGet: vi.fn(),
        mockCacheSet: vi.fn(),
        mockCacheFlushAll: vi.fn(),
        mockBucket: mockBucketObj
    };
});

vi.mock('node-cache', () => {
    return {
        default: class {
            get = mockCacheGet;
            set = mockCacheSet;
            flushAll = mockCacheFlushAll;
        }
    };
});

// Mock dependencies
vi.mock('@google-cloud/storage', () => {
    return {
        Storage: class {
            bucket(bucketName: string) {
                return mockBucket;
            }
        }
    };
});

const { mockInjectDecoratorServerSideDocument } = vi.hoisted(() => {
    return {
        mockInjectDecoratorServerSideDocument: vi.fn((config: any) => {
            return Promise.resolve({
                documentElement: {
                    outerHTML: '<html><head></head><body>mocked-with-dekorator</body></html>'
                }
            });
        })
    };
});

vi.mock('jsdom', () => {
    return {
        JSDOM: class {
            window: any;
            constructor(html: any) {
                this.window = {
                    document: {
                        documentElement: {
                            outerHTML: '<html><head></head><body>mocked-with-dekorator</body></html>'
                        }
                    }
                };
            }
        }
    };
});

vi.mock('@navikt/nav-dekoratoren-moduler/ssr/index.js', () => {
    return {
        injectDecoratorServerSideDocument: mockInjectDecoratorServerSideDocument
    };
});

vi.mock('../utils/logger.js', () => ({
    logger: {
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
    }
}));

describe('gcsRoute', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let sendSpy: Mock;
    let sendStatusSpy: Mock;
    let redirectSpy: Mock;
    let setHeaderSpy: Mock;
    let contentTypeSpy: Mock;

    const baseConfig = {
        bucketName: 'test-bucket',
        contextPath: '/app',
        fallbackStrategy: FallbackStrategy.NONE,
        enableModiaContextUpdater: undefined as any
    };

    // Helper to wait for async operations
    const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 50));

    // Helper to mock file download success
    const mockFileSuccess = (content: Buffer) => {
        mockBucket._mockFileDownload.mockImplementation((callback: Function) => {
            setImmediate(() => callback(null, content));
        });
    };

    // Helper to mock file download error
    const mockFileError = (error: Error = new Error('File not found')) => {
        mockBucket._mockFileDownload.mockImplementation((callback: Function) => {
            setImmediate(() => callback(error));
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset cache mocks - ensure cache always returns undefined (no cached content)
        mockCacheGet.mockReturnValue(undefined);
        mockCacheSet.mockReturnValue(true);

        // Reset mock file download function
        mockBucket._mockFileDownload.mockClear();
        mockBucket.file.mockClear();
        mockBucket.file.mockImplementation((path: string) => ({
            download: mockBucket._mockFileDownload
        }));

        // Setup mock request
        mockReq = {
            method: 'GET',
            path: '/app/index.html',
            headers: {}
        };

        // Setup mock response
        sendSpy = vi.fn();
        sendStatusSpy = vi.fn();
        redirectSpy = vi.fn();
        setHeaderSpy = vi.fn();
        contentTypeSpy = vi.fn();

        mockRes = {
            send: sendSpy,
            sendStatus: sendStatusSpy,
            redirect: redirectSpy,
            setHeader: setHeaderSpy,
            contentType: contentTypeSpy
        };
    });

    describe('Existing Features - Regression Tests', () => {
        describe('HTTP Method Handling', () => {
            it('should reject non-GET requests with 405', () => {
                mockReq.method = 'POST';
                const route = gcsRoute(baseConfig, undefined);

                route(mockReq as Request, mockRes as Response);

                expect(sendStatusSpy).toHaveBeenCalledWith(405);
                expect(mockBucket.file).not.toHaveBeenCalled();
            });

            it('should allow GET requests', async () => {
                mockFileSuccess(Buffer.from('test content'));

                const route = gcsRoute(baseConfig, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();
                expect(mockBucket.file).toHaveBeenCalled();
            });
        });

        describe('File Serving', () => {
            it('should serve existing files from bucket', async () => {
                const fileContent = Buffer.from('test content');
                mockFileSuccess(fileContent);

                const route = gcsRoute(baseConfig, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(mockBucket.file).toHaveBeenCalledWith('index.html');
                expect(contentTypeSpy).toHaveBeenCalled();
                expect(sendSpy).toHaveBeenCalledWith(fileContent);
            });

            it('should serve static files with cache headers', async () => {
                mockReq.path = '/app/static/main.js';
                const fileContent = Buffer.from('console.log("test")');
                mockFileSuccess(fileContent);

                const route = gcsRoute(baseConfig, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(setHeaderSpy).toHaveBeenCalledWith(
                    'Cache-Control',
                    'public, immutable, max-age=604800'
                );
            });

            it('should not set cache headers for non-static files', async () => {
                const fileContent = Buffer.from('test');
                mockFileSuccess(fileContent);

                const route = gcsRoute(baseConfig, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(setHeaderSpy).not.toHaveBeenCalled();
            });
        });

        describe('404 Handling', () => {
            it('should return 404 for missing files when fallbackStrategy is NONE', async () => {
                mockFileError();

                const route = gcsRoute(baseConfig, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(sendStatusSpy).toHaveBeenCalledWith(404);
            });

            it('should return 404 for missing image files regardless of fallback strategy', async () => {
                mockReq.path = '/app/images/logo.png';
                mockFileError();

                const config = {
                    ...baseConfig,
                    fallbackStrategy: FallbackStrategy.SERVE_INDEX_HTML
                };

                const route = gcsRoute(config, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(sendStatusSpy).toHaveBeenCalledWith(404);
            });
        });

        describe('Fallback Strategies', () => {
            it('should redirect to root when fallbackStrategy is REDIRECT_TO_ROOT', async () => {
                mockReq.path = '/app/some/deep/path';
                mockFileError();

                const config = {
                    ...baseConfig,
                    fallbackStrategy: FallbackStrategy.REDIRECT_TO_ROOT
                };

                const route = gcsRoute(config, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(redirectSpy).toHaveBeenCalledWith('/app');
            });

            it('should serve index.html when fallbackStrategy is SERVE_INDEX_HTML', async () => {
                mockReq.path = '/app/some/route';
                let callCount = 0;
                mockBucket._mockFileDownload.mockImplementation((callback: Function) => {
                    callCount++;
                    if (callCount === 1) {
                        // First call fails
                        setImmediate(() => callback(new Error('File not found')));
                    } else {
                        // Second call succeeds with index.html
                        setImmediate(() => callback(null, Buffer.from('<html>index</html>')));
                    }
                });

                const config = {
                    ...baseConfig,
                    fallbackStrategy: FallbackStrategy.SERVE_INDEX_HTML
                };

                const route = gcsRoute(config, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(mockBucket.file).toHaveBeenCalledTimes(2);
                expect(sendSpy).toHaveBeenCalled();
            });
        });

        describe('Path Handling', () => {
            it('should handle root path correctly', async () => {
                mockReq.path = '/app';
                mockFileSuccess(Buffer.from('test'));

                const route = gcsRoute(baseConfig, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(mockBucket.file).toHaveBeenCalledWith('index.html');
            });

            it('should handle paths with bucketContextPath', async () => {
                mockReq.path = '/app/some/file.js';
                mockFileSuccess(Buffer.from('test'));

                const config = {
                    ...baseConfig,
                    bucketContextPath: 'build'
                };

                const route = gcsRoute(config, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(mockBucket.file).toHaveBeenCalledWith('build/some/file.js');
            });

            it('should strip query parameters from paths', async () => {
                mockReq.path = '/app/index.html?version=123';
                mockFileSuccess(Buffer.from('test'));

                const route = gcsRoute(baseConfig, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(mockBucket.file).toHaveBeenCalledWith('index.html');
            });
        });
    });

    describe('Dekorator Injection - New Feature Tests', () => {
        const dekoratorConfig: JsonConfig.DekoratorConfig = {
            env: 'dev',
            simple: true,
            chatbot: false
        };

        describe('index.html with dekorator config', () => {
            it('should inject dekorator into index.html when config is provided', async () => {
                mockReq.path = '/app/index.html';
                const originalHtml = Buffer.from('<html><body>original</body></html>');
                mockFileSuccess(originalHtml);

                const route = gcsRoute(baseConfig, dekoratorConfig);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(sendSpy).toHaveBeenCalled();
                const sentBuffer = sendSpy.mock.calls[0][0];
                const sentContent = sentBuffer.toString();
                expect(sentContent).toContain('mocked-with-dekorator');
            });

            it('should serve index.html without injection when dekorator config is not provided', async () => {
                mockReq.path = '/app/index.html';
                const originalHtml = Buffer.from('<html><body>original</body></html>');
                mockFileSuccess(originalHtml);

                const route = gcsRoute(baseConfig, undefined);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(sendSpy).toHaveBeenCalledWith(originalHtml);
            });

            it('should inject dekorator in fallback SERVE_INDEX_HTML scenario', async () => {
                mockReq.path = '/app/some/spa/route';
                let callCount = 0;
                mockBucket._mockFileDownload.mockImplementation((callback: Function) => {
                    callCount++;
                    if (callCount === 1) {
                        setImmediate(() => callback(new Error('File not found')));
                    } else {
                        setImmediate(() => callback(null, Buffer.from('<html><body>index</body></html>')));
                    }
                });

                const config = {
                    ...baseConfig,
                    fallbackStrategy: FallbackStrategy.SERVE_INDEX_HTML
                };

                const route = gcsRoute(config, dekoratorConfig);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(sendSpy).toHaveBeenCalled();
                const sentBuffer = sendSpy.mock.calls[0][0];
                const sentContent = sentBuffer.toString();
                expect(sentContent).toContain('mocked-with-dekorator');
            });
        });

        describe('Non-index.html files should not be affected', () => {
            it('should not inject dekorator into JavaScript files', async () => {
                mockReq.path = '/app/main.js';
                const jsContent = Buffer.from('console.log("test")');
                mockFileSuccess(jsContent);

                const route = gcsRoute(baseConfig, dekoratorConfig);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(sendSpy).toHaveBeenCalledWith(jsContent);
            });

            it('should not inject dekorator into CSS files', async () => {
                mockReq.path = '/app/styles.css';
                const cssContent = Buffer.from('body { color: red; }');
                mockFileSuccess(cssContent);

                const route = gcsRoute(baseConfig, dekoratorConfig);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(sendSpy).toHaveBeenCalledWith(cssContent);
            });

            it('should not inject dekorator into image files', async () => {
                mockReq.path = '/app/logo.png';
                const imageContent = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG header
                mockFileSuccess(imageContent);

                const route = gcsRoute(baseConfig, dekoratorConfig);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(sendSpy).toHaveBeenCalledWith(imageContent);
            });

            it('should not inject dekorator into JSON files', async () => {
                mockReq.path = '/app/manifest.json';
                const jsonContent = Buffer.from('{"name": "app"}');
                mockFileSuccess(jsonContent);

                const route = gcsRoute(baseConfig, dekoratorConfig);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(sendSpy).toHaveBeenCalledWith(jsonContent);
            });
        });

        describe('Dekorator injection error handling', () => {
            it('should fall back to original content if dekorator injection fails', async () => {
                mockInjectDecoratorServerSideDocument.mockRejectedValueOnce(new Error('Injection failed'));

                mockReq.path = '/app/index.html';
                const originalHtml = Buffer.from('<html><body>original</body></html>');
                mockFileSuccess(originalHtml);

                const route = gcsRoute(baseConfig, dekoratorConfig);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                expect(sendSpy).toHaveBeenCalledWith(originalHtml);
            });
        });

        describe('Cache behavior with dekorator injection', () => {
            it('should update cache with decorator-injected HTML when dekorator config is provided', async () => {
                mockReq.path = '/app/index.html';
                const originalHtml = Buffer.from('<html><body>original</body></html>');
                mockFileSuccess(originalHtml);

                const route = gcsRoute(baseConfig, dekoratorConfig);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                // Verify cache was set
                expect(mockCacheSet).toHaveBeenCalled();

                // The cache should be updated with INJECTED content, not original
                const cacheSetCalls = mockCacheSet.mock.calls;
                expect(cacheSetCalls.length).toBeGreaterThan(0);

                const cachedContent = cacheSetCalls[cacheSetCalls.length - 1][1]; // Get the content that was cached
                const cachedContentString = cachedContent.toString();

                // IMPORTANT: The cached content should be the INJECTED content
                expect(cachedContentString).toContain('mocked-with-dekorator');
                expect(cachedContentString).not.toContain('original'); // Should NOT be the original

                // Verify that the response contains injected content
                expect(sendSpy).toHaveBeenCalled();
                const sentBuffer = sendSpy.mock.calls[0][0];
                const sentContent = sentBuffer.toString();
                expect(sentContent).toContain('mocked-with-dekorator');
            });

            it('should serve cached decorator-injected content without re-injecting on subsequent requests', async () => {
                mockReq.path = '/app/index.html';
                const cachedInjectedHtml = Buffer.from('<html><head></head><body>mocked-with-dekorator</body></html>');

                // Set up cache to return already-injected content
                mockCacheGet.mockReturnValue(cachedInjectedHtml);

                const route = gcsRoute(baseConfig, dekoratorConfig);
                route(mockReq as Request, mockRes as Response);

                await waitForAsync();

                // Bucket should not be called since content is cached
                expect(mockBucket.file).not.toHaveBeenCalled();

                // Decorator injection should NOT be called again since we're serving cached injected content
                expect(mockInjectDecoratorServerSideDocument).not.toHaveBeenCalled();

                // Verify response contains the cached injected content
                expect(sendSpy).toHaveBeenCalled();
                const sentBuffer = sendSpy.mock.calls[0][0];
                const sentContent = sentBuffer.toString();
                expect(sentContent).toContain('mocked-with-dekorator');
            });
        });

        describe('Different path types with decorator injection', () => {
            describe('WITH decorator config', () => {
                it('should inject decorator for root path (empty after context)', async () => {
                    mockReq.path = '/app';
                    const originalHtml = Buffer.from('<html><body>root</body></html>');
                    mockFileSuccess(originalHtml);

                    const route = gcsRoute(baseConfig, dekoratorConfig);
                    route(mockReq as Request, mockRes as Response);

                    await waitForAsync();

                    expect(mockBucket.file).toHaveBeenCalledWith('index.html');
                    expect(sendSpy).toHaveBeenCalled();
                    const sentContent = sendSpy.mock.calls[0][0].toString();
                    expect(sentContent).toContain('mocked-with-dekorator');
                });

                it('should inject decorator for single slash path', async () => {
                    mockReq.path = '/app/';
                    const originalHtml = Buffer.from('<html><body>slash</body></html>');
                    mockFileSuccess(originalHtml);

                    const route = gcsRoute(baseConfig, dekoratorConfig);
                    route(mockReq as Request, mockRes as Response);

                    await waitForAsync();

                    expect(mockBucket.file).toHaveBeenCalledWith('index.html');
                    expect(sendSpy).toHaveBeenCalled();
                    const sentContent = sendSpy.mock.calls[0][0].toString();
                    expect(sentContent).toContain('mocked-with-dekorator');
                });

                it('should inject decorator for explicit index.html path', async () => {
                    mockReq.path = '/app/index.html';
                    const originalHtml = Buffer.from('<html><body>explicit</body></html>');
                    mockFileSuccess(originalHtml);

                    const route = gcsRoute(baseConfig, dekoratorConfig);
                    route(mockReq as Request, mockRes as Response);

                    await waitForAsync();

                    expect(mockBucket.file).toHaveBeenCalledWith('index.html');
                    expect(sendSpy).toHaveBeenCalled();
                    const sentContent = sendSpy.mock.calls[0][0].toString();
                    expect(sentContent).toContain('mocked-with-dekorator');
                });

                it('should inject decorator for unknown path with SERVE_INDEX_HTML fallback', async () => {
                    mockReq.path = '/app/unknown/route';
                    let callCount = 0;
                    mockBucket._mockFileDownload.mockImplementation((callback: Function) => {
                        callCount++;
                        if (callCount === 1) {
                            // First call for unknown/route fails
                            setImmediate(() => callback(new Error('File not found')));
                        } else {
                            // Second call for index.html succeeds
                            setImmediate(() => callback(null, Buffer.from('<html><body>fallback</body></html>')));
                        }
                    });

                    const config = {
                        ...baseConfig,
                        fallbackStrategy: FallbackStrategy.SERVE_INDEX_HTML
                    };

                    const route = gcsRoute(config, dekoratorConfig);
                    route(mockReq as Request, mockRes as Response);

                    await waitForAsync();

                    expect(mockBucket.file).toHaveBeenCalledTimes(2);
                    expect(mockBucket.file).toHaveBeenCalledWith('unknown/route');
                    expect(mockBucket.file).toHaveBeenCalledWith('index.html');
                    expect(sendSpy).toHaveBeenCalled();
                    const sentContent = sendSpy.mock.calls[0][0].toString();
                    expect(sentContent).toContain('mocked-with-dekorator');
                });

                it('should inject decorator for deep nested unknown path with SERVE_INDEX_HTML fallback', async () => {
                    mockReq.path = '/app/some/deep/nested/route';
                    let callCount = 0;
                    mockBucket._mockFileDownload.mockImplementation((callback: Function) => {
                        callCount++;
                        if (callCount === 1) {
                            setImmediate(() => callback(new Error('File not found')));
                        } else {
                            setImmediate(() => callback(null, Buffer.from('<html><body>deep-fallback</body></html>')));
                        }
                    });

                    const config = {
                        ...baseConfig,
                        fallbackStrategy: FallbackStrategy.SERVE_INDEX_HTML
                    };

                    const route = gcsRoute(config, dekoratorConfig);
                    route(mockReq as Request, mockRes as Response);

                    await waitForAsync();

                    expect(sendSpy).toHaveBeenCalled();
                    const sentContent = sendSpy.mock.calls[0][0].toString();
                    expect(sentContent).toContain('mocked-with-dekorator');
                });
            });

            describe('WITHOUT decorator config', () => {
                it('should serve original HTML for root path without injection', async () => {
                    mockReq.path = '/app';
                    const originalHtml = Buffer.from('<html><body>root-no-inject</body></html>');
                    mockFileSuccess(originalHtml);

                    const route = gcsRoute(baseConfig, undefined);
                    route(mockReq as Request, mockRes as Response);

                    await waitForAsync();

                    expect(mockBucket.file).toHaveBeenCalledWith('index.html');
                    expect(sendSpy).toHaveBeenCalledWith(originalHtml);
                    expect(mockInjectDecoratorServerSideDocument).not.toHaveBeenCalled();
                });

                it('should serve original HTML for single slash path without injection', async () => {
                    mockReq.path = '/app/';
                    const originalHtml = Buffer.from('<html><body>slash-no-inject</body></html>');
                    mockFileSuccess(originalHtml);

                    const route = gcsRoute(baseConfig, undefined);
                    route(mockReq as Request, mockRes as Response);

                    await waitForAsync();

                    expect(mockBucket.file).toHaveBeenCalledWith('index.html');
                    expect(sendSpy).toHaveBeenCalledWith(originalHtml);
                    expect(mockInjectDecoratorServerSideDocument).not.toHaveBeenCalled();
                });

                it('should serve original HTML for explicit index.html path without injection', async () => {
                    mockReq.path = '/app/index.html';
                    const originalHtml = Buffer.from('<html><body>explicit-no-inject</body></html>');
                    mockFileSuccess(originalHtml);

                    const route = gcsRoute(baseConfig, undefined);
                    route(mockReq as Request, mockRes as Response);

                    await waitForAsync();

                    expect(mockBucket.file).toHaveBeenCalledWith('index.html');
                    expect(sendSpy).toHaveBeenCalledWith(originalHtml);
                    expect(mockInjectDecoratorServerSideDocument).not.toHaveBeenCalled();
                });

                it('should serve original HTML for unknown path with SERVE_INDEX_HTML fallback without injection', async () => {
                    mockReq.path = '/app/unknown/route';
                    let callCount = 0;
                    mockBucket._mockFileDownload.mockImplementation((callback: Function) => {
                        callCount++;
                        if (callCount === 1) {
                            setImmediate(() => callback(new Error('File not found')));
                        } else {
                            setImmediate(() => callback(null, Buffer.from('<html><body>fallback-no-inject</body></html>')));
                        }
                    });

                    const config = {
                        ...baseConfig,
                        fallbackStrategy: FallbackStrategy.SERVE_INDEX_HTML
                    };

                    const route = gcsRoute(config, undefined);
                    route(mockReq as Request, mockRes as Response);

                    await waitForAsync();

                    expect(mockBucket.file).toHaveBeenCalledTimes(2);
                    expect(sendSpy).toHaveBeenCalled();
                    const sentBuffer = sendSpy.mock.calls[0][0];
                    expect(sentBuffer.toString()).toBe('<html><body>fallback-no-inject</body></html>');
                    expect(mockInjectDecoratorServerSideDocument).not.toHaveBeenCalled();
                });

                it('should serve original HTML for deep nested unknown path with SERVE_INDEX_HTML fallback without injection', async () => {
                    mockReq.path = '/app/some/deep/nested/route';
                    let callCount = 0;
                    mockBucket._mockFileDownload.mockImplementation((callback: Function) => {
                        callCount++;
                        if (callCount === 1) {
                            setImmediate(() => callback(new Error('File not found')));
                        } else {
                            setImmediate(() => callback(null, Buffer.from('<html><body>deep-fallback-no-inject</body></html>')));
                        }
                    });

                    const config = {
                        ...baseConfig,
                        fallbackStrategy: FallbackStrategy.SERVE_INDEX_HTML
                    };

                    const route = gcsRoute(config, undefined);
                    route(mockReq as Request, mockRes as Response);

                    await waitForAsync();

                    expect(sendSpy).toHaveBeenCalled();
                    const sentBuffer = sendSpy.mock.calls[0][0];
                    expect(sentBuffer.toString()).toBe('<html><body>deep-fallback-no-inject</body></html>');
                    expect(mockInjectDecoratorServerSideDocument).not.toHaveBeenCalled();
                });
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle paths without context path prefix', async () => {
            mockReq.path = '/other/path';
            mockFileError();

            const route = gcsRoute(baseConfig, undefined);
            route(mockReq as Request, mockRes as Response);

            await waitForAsync();

            expect(sendStatusSpy).toHaveBeenCalledWith(404);
        });

        it('should handle empty path correctly', async () => {
            mockReq.path = '/app/';
            mockFileSuccess(Buffer.from('test'));

            const route = gcsRoute(baseConfig, undefined);
            route(mockReq as Request, mockRes as Response);

            await waitForAsync();

            expect(mockBucket.file).toHaveBeenCalledWith('index.html');
        });
    });
});
