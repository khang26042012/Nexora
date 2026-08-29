package com.nexora.secret.ws;

import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.util.logging.Logger;

public class WebSocketClient extends org.java_websocket.client.WebSocketClient {

    private final Logger logger;
    private volatile boolean intentionalClose = false;
    private int reconnectDelay = 5; // seconds
    private static final int MAX_RECONNECT_DELAY = 60;

    public WebSocketClient(String url, Logger logger) {
        super(URI.create(url));
        this.logger = logger;
        this.setConnectionLostTimeout(30); // ping every 30s
    }

    @Override
    public void onOpen(ServerHandshake handshake) {
        logger.info("Connected to Nexora metrics server");
        reconnectDelay = 5; // reset backoff on successful connect
    }

    @Override
    public void onMessage(String message) {
        // Server doesn't send messages to plugin, but handle gracefully
        logger.fine("Received from server: " + message);
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        if (intentionalClose) {
            logger.info("WebSocket closed intentionally");
            return;
        }
        
        logger.warning("WebSocket disconnected (code=" + code + ", remote=" + remote + "). Reconnecting in " + reconnectDelay + "s...");
        scheduleReconnect();
    }

    @Override
    public void onError(Exception ex) {
        logger.warning("WebSocket error: " + ex.getMessage());
    }

    public void close() {
        intentionalClose = true;
        super.close();
    }

    private void scheduleReconnect() {
        new Thread(() -> {
            try {
                Thread.sleep(reconnectDelay * 1000L);
                if (!intentionalClose) {
                    logger.info("Attempting WebSocket reconnect...");
                    reconnect();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                logger.warning("Reconnect failed: " + e.getMessage());
                // Exponential backoff
                reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
                scheduleReconnect();
            }
        }, "secret-ws-reconnect").start();
    }
}
