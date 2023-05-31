#!/bin/bash

IMAGE_NAME='beer'
CID_FILE="/tmp/${IMAGE_NAME}.cid"
SCRIPT_DIR=$(dirname "$0")
WORKSPACE=`pwd`/..
DOCKER_WORKSPACE='/var/www/beer'


docker rm -f -v "$IMAGE_NAME" > /dev/null 2>&1
rm -f "$CID_FILE"

echo "Running docker container"
docker run -d --cidfile="$CID_FILE" -v "${WORKSPACE}":${DOCKER_WORKSPACE}:rw -w ${DOCKER_WORKSPACE} -p 80:80 -p 443:443 --name $IMAGE_NAME $IMAGE_NAME
echo ""

while [ ! -f "$CID_FILE" ]
do
  sleep 1
done