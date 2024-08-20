"use strict";

const express = require("express");
const axios = require("axios");

// import the OpenTelemetry api library
const api = require("@opentelemetry/api");
// create a tracer and name it after your package
const tracer = api.trace.getTracer("myInstrumentation");


// Constants
const PORT = process.env.PORT || 80;
const HOST = process.env.HOST || "0.0.0.0";
const USERS_SERVICE_URL = process.env.SERVICE_URL || "http://users";

// App
const app = express();

async function checkWeather(weather, res) {
  switch (weather) {
    // it's raining, we are loosing time
    case "rain":
      await sleep(1500);
      res.status(202).send("Hello Rainy World!\n");
      break;

    // it's snowing, generate error
    case "snow":
      res.status(500).send("Bye Bye Snow!\n");
      console.log(`ERROR: IT IS SNOWING`);
      break;

    // by default, it's sunny
    default:
      res.status(200).send("Hello Sunny World!\n");
  }
}

async function generateWork(nb) {
  for (let i = 0; i < Number(nb); i++) {
    // create a new span
    // the current span is automatically used as parent unless one
    // is explicitly provided as an argument
    // the span you create then automatically becomes the current one
    let span = tracer.startSpan("generateWork");
    // add an attribute
    span.setAttribute("iterations.current", i + 1);
    span.setAttribute("iterations.total", nb);
    // log an event and include some structured data
    span.addEvent(`*** DOING SOMETHING ${i}`);
    // wait for 50ms to simulate doing some work
    await sleep(50);
    // don't forget to always end the span to flush data out
    span.end();
  }
}


async function main() {
  app.get("/", (req, res) => {
    let nbLoop = req.query.loop;
    let weather = req.query.weather;

    // access the current span from the active context
    let activeSpan = api.trace.getSpan(api.context.active());
    // add an attribute
    activeSpan.setAttribute("nbLoop", nbLoop);
    activeSpan.setAttribute("weather", weather);


    // generate some work
    if (nbLoop != undefined) {
      generateWork(nbLoop);
    }
    // Set the response based on the weather input
    if (weather == undefined) {
      res.send("This is the start of a whoel new World!\n");
    } else {
      checkWeather(weather, res);
    }
  });

  app.get("/api/data", (req, res) => {

    // access the current span from the active context
    let activeSpan = api.trace.getSpan(api.context.active());
    // log an event and include some structured data
    activeSpan.addEvent(`Making request to ${USERS_SERVICE_URL}/api/data`);


    axios
      .get(USERS_SERVICE_URL + "/api/data")
      .then((response) => {
        res.json(response.data);
      })
      .catch((err) => {
        console.error("Error forwarding request:");
        console.error((err && err.stack) || err);
        res.sendStatus(500);
      });
  });

  await startServer();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    app.listen(PORT, HOST, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

main()
  .then(() => console.log("Online"))
  .catch((err) => {
    console.error("Failed to start!");
    console.error((err && err.stack) || err);
  });
