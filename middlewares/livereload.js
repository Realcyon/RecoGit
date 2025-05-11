export default (req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    body = body.replace(/<\/body>/gi, `
        <script type="module">
        let socket = null;
        connect();

        function connect(){
          socket = new WebSocket("ws://localhost:8080");
          socket.addEventListener("message", (event) => {
            if(event.data == "r"){
              location.reload();
            }
          });
          socket.addEventListener("close",(event) => {
            connect();
          })
        }
        </script>
        </body>`)
    originalSend.call(this, body);
  };
  next();
}

