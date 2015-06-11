FROM google/nodejs

EXPOSE 8080

WORKDIR /app
ADD package.json /app/
RUN npm install express --save
RUN npm install express-handlebars --save
RUN npm install redis --save
RUN npm install forever -g --save
RUN npm install body-parser --save
RUN npm install
ADD . /app

#CMD ["nodemon","server.js"]
#ENTRYPOINT ["/nodejs/bin/npm", "start"]
