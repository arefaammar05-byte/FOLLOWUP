"use strict";

const CACHE_NAME = "followup-v3";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json"
];


/* INSTALL */

self.addEventListener("install", function(event) {

    event.waitUntil(

        caches.open(CACHE_NAME)
        .then(function(cache) {

            return cache.addAll(APP_FILES);

        })
        .then(function() {

            return self.skipWaiting();

        })

    );

});


/* ACTIVATE */

self.addEventListener("activate", function(event) {

    event.waitUntil(

        caches.keys()
        .then(function(cacheNames) {

            return Promise.all(

                cacheNames
                .filter(function(cacheName) {

                    return cacheName !== CACHE_NAME;

                })
                .map(function(cacheName) {

                    return caches.delete(cacheName);

                })

            );

        })
        .then(function() {

            return self.clients.claim();

        })

    );

});


/* FETCH */

self.addEventListener("fetch", function(event) {

    if (event.request.method !== "GET") {
        return;
    }


    const requestUrl =
        new URL(event.request.url);


    /* Never interfere with external services */

    if (
        requestUrl.origin !==
        self.location.origin
    ) {
        return;
    }


    /* Always get navigation pages from the network */

    if (
        event.request.mode === "navigate"
    ) {

        event.respondWith(

            fetch(event.request)
            .catch(function() {

                return caches.match(
                    "./index.html"
                );

            })

        );

        return;
    }


    /* Cache static files */

    event.respondWith(

        caches.match(event.request)
        .then(function(cachedResponse) {

            return (
                cachedResponse ||
                fetch(event.request)
            );

        })

    );

});