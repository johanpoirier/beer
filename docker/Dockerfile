FROM nginx:1.11.13

MAINTAINER Johan Poirier, johan.poirier@gmail.com

# Prerequisites
RUN apt-get update && apt-get install -y curl git

# Nginx
RUN rm /etc/nginx/conf.d/default.conf
COPY ./config/nginx.conf /etc/nginx/conf.d/next.conf
RUN mkdir /etc/nginx/ssl/ && openssl req -new -nodes -x509 -subj "/C=FR/ST=France/L=Lyon/O=FR/CN=next.local" -days 3650 -keyout /etc/nginx/ssl/next.local.key -out /etc/nginx/ssl/next.local.crt -extensions v3_ca

# Node.js
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - && apt-get install -y nodejs

# Run
CMD ["nginx", "-g", "daemon off;"]
