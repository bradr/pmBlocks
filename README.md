# OpenBuildingCodes
Open Building Codes Search

Deployment:

First time:
//docker pull nginx
NODEJS SERVER
REDIS SERVER
docker pull makuk66/docker-solr

Addresses need to be absolute (update per local filesystem)

//docker run --rm -p 80:80 -v /Users/bradr/github/local/OpenBC/static:/usr/share/nginx/html -v /Users/bradr/github/local/OpenBC/etc/nginx/sites-available/:/etc/nginx/sites-available nginx &

docker run -it -p 8983:8983 -t makuk66/docker-solr &
