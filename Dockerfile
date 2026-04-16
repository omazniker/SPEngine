FROM nginx:alpine
COPY tests/test_lexicographic.html /usr/share/nginx/html/index.html
RUN chmod 644 /usr/share/nginx/html/index.html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
