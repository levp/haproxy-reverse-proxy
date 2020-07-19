# HTTP Reverse proxy

## Features

- Transparent HTTP reverse proxying via Haproxy.
- Full request body processing via Logstash.
- Prometheus metrics exporter.

Extra features:

- Limiting total request time to 100ms. In case of delayed response by the backend, a response of `204 No Content` will be returned and the client will not be made aware that a timeout has ocurred.

## Requirements

- docker
- docker-compose

And for testing:

- Node.js

## Running everything at once

`sudo docker-compose up`

### HAProxy: Reverse proxy

A HAProxy docker container configured via the `./config/haproxy.cfg` file binds to port `8080` and forwards all HTTP requests to `localhost:3333`.

The following cases will return a `204 No Content` resposne to the client, as determined in the `errorfile` section in the config file:
- The backend actually returned a `204 No Content` response.
- The backend did not respond in time. (`504 Gateway Timeout`)
- The backend cannot be reached for some reason. (`503 Service Unavailable`)
- `500 Internal Server Error`
- `502 Bad Gateway`

A `:8404/admin?stats` endpoint exposes various metrics in the form of an HTML page.

### Logstash: Data filtering and transformation

The HAProxy server is configured to send the full request body of every incoming request to a Logstash container via syslog. Logstash is listening for incoming data on UDP socket and will process the data, potentially sending the output to something like an Apache Kafka topic or simply a file.

### HAProxy Exporter: Prometheus metrics

Scrape endpoint: `:9101/metrics`

A HAProxy exporter container will read data from the `:8404/admin?stats;csv` endpoint exposes by HAProxy and make the data available for scraping by Prometheus.

Example stat: `haproxy_frontend_http_requests_total{frontend="reverse_proxy"}`  
This is the *total number of requests* received by the reverse proxy endpoint since HAProxy was launched. Measuring the delta between snapshots should provide a good indication of the incoming request rate.

## Development and testing

A simple Node.js server without any dependencies exists the `./dev/mirror-server.js` file. The server binds to port 3333 and will return a response that contains the full request body that was sent to it. This server will also delay sending out each response by a random amount of time, making HAProxy think that some of the responses have timed out - this can be used to test how such an event is propagated to the client. Hopefully they will not be made aware of it and will simply see a `204 No Content` response.

### Testing

Launch the containers, potentially in three different terminals. Launch order is irrelevant.  
`sudo docker-compose up haproxy`  
`sudo docker-compose up logstash`  
`sudo docker-compose up exporter`  

Launch the express server:  
`node ./dev/mirror-server.js`

Sending a few request to the proxy, will sometimes return `204` due to timeout. The URL path and query parameters can be anything:  
`curl -v localhost:8080/fewf?23432 -d '{"app":{"name":"Game Lad"},"device":{"ifa":"3ab9-97da"}}'`  
The message in parsed+filtered form should appear in the logstash logs (due to `stdout` output currently defined in the logstash pipeline).

You can also senda request directly to the express server. This will never return `204`:  
`curl -v localhost:3333/fewf?23432 -d '{"app":{"name":"Game Lad"},"device":{"ifa":"3ab9-97da"}}'`
