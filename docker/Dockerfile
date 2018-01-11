FROM nginx:1.11.13

MAINTAINER Johan Poirier, johan.poirier@gmail.com

# Prerequisites
RUN apt-get update && apt-get install -y curl git

# Nginx
RUN rm /etc/nginx/conf.d/default.conf && mkdir /etc/nginx/ssl/
COPY ./config/nginx.conf /etc/nginx/conf.d/beer.conf
COPY ./config/openssl.cnf /etc/nginx/ssl/openssl.cnf
RUN openssl req -config /etc/nginx/ssl/openssl.cnf -new -x509 -sha256 -newkey rsa:2048 -nodes -days 3650 -keyout /etc/nginx/ssl/beer.local.key -out /etc/nginx/ssl/beer.local.crt

# Node.js
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - && apt-get install -y nodejs

# Run
CMD ["nginx", "-g", "daemon off;"]
