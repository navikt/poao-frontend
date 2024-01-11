import client, { register }  from 'prom-client';
import express from "express";

export const errorCounter = new client.Counter({
    name: "network_errors",
    help: "Network errors from in proxy app",
    labelNames: ["errorType", 'consumerId']
})

export const configureMetrics = (app: express.Application) => {
    register.registerMetric(errorCounter)
    app.get('/metrics', async (_req, res) => {
        try {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        } catch (err) {
            res.status(500).end(err);
        }
    });
}
