package com.khang2604.rconkhang;

import java.util.*;

public class ActionLogger {
    private final int maxHistory;
    private final Deque<Map<String, Object>> history = new ArrayDeque<>();

    public ActionLogger(int maxHistory) {
        this.maxHistory = maxHistory;
    }

    public synchronized void log(String adminName, String action, String target, String detail) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("ts", System.currentTimeMillis());
        entry.put("admin", adminName);
        entry.put("action", action);
        entry.put("target", target == null ? "" : target);
        entry.put("detail", detail == null ? "" : detail);
        history.addFirst(entry);
        while (history.size() > maxHistory) history.removeLast();
    }

    public synchronized List<Map<String, Object>> getRecent(int limit) {
        List<Map<String, Object>> out = new ArrayList<>();
        int i = 0;
        for (Map<String, Object> entry : history) {
            if (i++ >= limit) break;
            out.add(entry);
        }
        return out;
    }
}
