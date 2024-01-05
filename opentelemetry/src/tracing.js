const opentelemetry = require("@opentelemetry/sdk-node");
const { logs } = require("@opentelemetry/api-logs");

const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");

const {
  OTLPMetricExporter,
} = require("@opentelemetry/exporter-metrics-otlp-proto");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");

const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-grpc");
const {
  LoggerProvider,
  BatchLogRecordProcessor,
} = require("@opentelemetry/sdk-logs");

const loggerExporter = new OTLPLogExporter({
  url: "http://otel-collector:4317",
});
const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(
  new BatchLogRecordProcessor(loggerExporter)
);

logs.setGlobalLoggerProvider(loggerProvider);

const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");

const sdk = new opentelemetry.NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: "http://otel-collector:4317" }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: "http://otel-collector:4318/v1/metrics",
    }),
    exportIntervalMillis: 3000,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
