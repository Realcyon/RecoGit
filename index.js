import express from "express";
import fs from "fs";
import Handlebars from "handlebars";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

import { dirname, join as pathJoin } from "node:path";
import { fileURLToPath } from "node:url";
import path from "path";  

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use("/public", express.static("public"));
app.use(bodyParser.json());
app.use("/", (req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    console.log("sending");
    console.log(body);
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
})
//console.log(path); 

function strFromFile(path, options = { createOnNotFoun: false, defaultContent: "" }) {
  try {
    return fs.readFileSync(path).toString();
  } catch (err) {
    if (options.createOnNotFoun) {
      fs.writeFileSync(path, options.defaultContent)
    }

    return options.defaultContent;
  }
}
//strFromFile(path, {createOnNotFoun: true, defaultContent: "{}"});
//strFromFile(path);

const views = {
  index: Handlebars.compile(
    strFromFile(pathJoin(__dirname, "views", "templates", "index.hbs"))
  ),
  section: Handlebars.compile(
    strFromFile(pathJoin(__dirname, "views", "templates", "section.hbs"))
  ),
  add: Handlebars.compile(
    strFromFile(pathJoin(__dirname, "views", "templates", "add.hbs"))
  )
};

const partials = {
  header: Handlebars.registerPartial("header",
    strFromFile(pathJoin(__dirname, "views", "partials", "header.html"))
  ),
  footer: Handlebars.registerPartial("footer",
    strFromFile(pathJoin(__dirname, "views", "partials", "footer.html"))
  ),
  navigation: Handlebars.compile(
    strFromFile(pathJoin(__dirname, "views", "partials", "nav.hbs")))
};

const dataTitleRegister = JSON.parse(
  strFromFile(
    pathJoin(__dirname, "public", "titleRegister.json"),
    {
      createOnNotFoun: true,
      defaultContent: "{}"
    }
  )
);
const sendNavigation = partials.navigation({ navSection: Object.keys(dataTitleRegister) });

function shortNotes(section) {

  const NOTE_CHAR_LIMIT = 75;
  const sectionKeys = Object.keys(section);

  const shortenedSection = sectionKeys.map(s => {
    if (section[s].notes.length >= NOTE_CHAR_LIMIT) {
      section[s] = { ...section[s], notes: section[s].notes.slice(0, NOTE_CHAR_LIMIT) + "…" };
    }
    section[s].id = s;
    return section[s];
  })

  return shortenedSection;
}

app.get("/", (req, res) => {
  let titleSelector = [];
  //console.log(dataTitleRegister);
  // console.log(typeof(dataTitleRegister));
  let listSection = Object.keys(dataTitleRegister);
  console.log("keys", Object.keys(dataTitleRegister))

  listSection.sort((a, b) => dataTitleRegister[b].length - dataTitleRegister[a].length)
  //console.log(listSection);

  listSection.forEach(oneSection => {
    const section = dataTitleRegister[oneSection];
    const sectionSize = Object.keys(section).length;

    let randomSelector = Math.floor(Math.random() * sectionSize);
    const randomKey = Object.keys(section)[randomSelector];
    
    console.log(randomSelector);
    console.log(randomKey);
    console.log("temoin");
    console.log(section);
    console.log(section[randomKey].title);

    titleSelector.push({
      "sectionName": oneSection,
      "sectionLength": sectionSize,
      "title": section[randomKey].title,
      "date": section[randomKey].additionDate,
      "notes": section[randomKey].notes
    })
  });

  const shortenedTitleSelector = shortNotes(titleSelector);
  console.log(shortenedTitleSelector)
  res.send(views.index({ navigation: sendNavigation, section: shortenedTitleSelector }));
});


app.get("/section/:sectionName", (req, res) => {
  const section = dataTitleRegister[req.params.sectionName];

  if (1==1) {//req.query.sortType

    const sortType = req.query.sortType;
    const sectionKeys = Object.keys(section);

    console.log(sortType);
    console.log(typeof sortType);
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#sorting_non-ascii_characters
    switch (sortType) {
      case "alpha":
        sectionKeys.sort((a, b) => section[a].title.localeCompare(section[b].title));
        break;
      case "!alpha":
        sectionKeys.sort((a, b) => -1 * section[a].title.localeCompare(section[b].title));
        break;
      case "date":
        sectionKeys.sort((a, b) => section[b].additionDate - section[a].additionDate);
        break;
      case "!date":
        sectionKeys.sort((a, b) => section[a].additionDate - section[b].additionDate);
        break;
      default:
        console.error("unsuported sorting type " + sortType);
    }
  }
  // if (req.query.search) {
  //   shortenedSection.sort((a, b) => {
  //     a - b
  //   })
  // }

  //  if(req.query.sortType[0]=="!"){
  //    shortenedSection = shortenedSection.reverse();
  //  }
  // probablement mieux de le mettre coté client
  //  shortenedSection.forEach((piece) => piece.additionDate = piece.additionDate.getTime()
  //  )

  res.send(
    views.section({
      navigation: sendNavigation,
      name: req.params.sectionName,
      piece: shortNotes(section)
    })
  );
  console.log(shortNotes(section))
});


//app.get("/add", (req, res) => {
//  res.send(views.add({ navigation: sendNavigation }));
//});


app.post("/api/add", (req, res) => {
  const request = req.body;

  if (request.title.trim() == "") {
    res.status(400).send("le titre est obligatoire");
    return;
  }

  if (request.section.trim() == "") {
    res.status(400).send("la section est obligatoire");
    return;
  }

  const storedSection = dataTitleRegister[req.body.section];
  if (storedSection
    && storedSection.map((a) => a.title).includes(req.body.title)) {
    res.status(400).send("Ce titre est deja en memoire");
    return;
  }
  // ok, maintenant que les checks sont fait, on passe au reste

  // plutot que d'avoir 2 strategies d'insertion (une quand la section et existe et une quand elle existe pas)
  // on check juste si elle existe pas, et si c'est la cas on la creer
  if (!(Object.keys(dataTitleRegister).includes(request.section))) {
    dataTitleRegister[request.section] = [];
  }

  dataTitleRegister[request.section].push({
    "title": request.title,
    "additionDate": Date.now(),  // toujours les stocker sous forme de timestamp UTC+0 comme ca on peut generer toutes les version "lisibles par les humains" a partir de la. Mais on stocke la version "neutre" avec toutes les infos et puis c'est un entien 32bits, pas une string
    "notes": request.note
  });

  fs.writeFileSync(path.join(".", "public", "titleRegister.json"), JSON.stringify(dataTitleRegister));

  res.sendStatus(200);
})


app.post("/api/section/display", (req, res) => {
  const request = req.body;
  const resPiece = dataTitleRegister[request.section][request.id];
  res.send(resPiece);
})


app.post("/api/section/edit", (req, res) => {
  const request = req.body;

  if(Object.keys(dataTitleRegister[request.section]).includes(request.id)){ 
  }else{
    console.log("notInside");
    dataTitleRegister[request.section][request.id] = {
      "title": "",
      "additionDate": Date.now(),  // toujours les stocker sous forme de timestamp UTC+0 comme ca on peut generer toutes les version "lisibles par les humains" a partir de la. Mais on stocke la version "neutre" avec toutes les infos et puis c'est un entien 32bits, pas une string
      "notes": ""}
      console.log(dataTitleRegister);
    }
  //const replaceIndex = dataTitleRegister[request.section].findIndex((el) => el.oldTitle == request.title)
  //console.log(replaceIndex);
 //console.log(dataTitleRegister);
  dataTitleRegister[request.section][request.id].notes = request.notes;
  dataTitleRegister[request.section][request.id].title = request.title;

  fs.writeFile(path.join(".", "public", "titleRegister.json"), JSON.stringify(dataTitleRegister, null, 2),(err) => {
    if(err){
      const responseToSave = {goal:"save",id:req.body.postId,sucess:false}
      res.send(JSON.stringify(responseToSave));
      console.log("saveError");
    }else{
      const responseToSave = {goal:"save",id:req.body.postId,sucess:true}
      res.send(JSON.stringify(responseToSave));
      console.log("savedSucessfully");
    }
  });
  //Renvoyer un message aux client pour l'informer si la sauvergarde a été efféctuer ou si elle a échoué
  
})

app.post("/api/section/delete", (req, res) => {
  const idDelete = req.body.id;
  const section = req.body.section;
  //console.log(titleDelete);
  //const deleteIndex = dataTitleRegister[section].findIndex((el) => el.title == titleDelete);
  //dataTitleRegister[section].splice(deleteIndex,1)
  delete dataTitleRegister[section][idDelete];
  console.log("deleting");
  fs.writeFile(path.join(".", "public", "titleRegister.json"), JSON.stringify(dataTitleRegister),(err) => {
    if(err){
      const responseToDelete = {goal:"delete",id:req.body.postId,sucess:false}
      res.send(JSON.stringify(responseToDelete));

      console.log("deleteError");
    }else{
      const responseToDelete = {goal:"delete",id:req.body.postId,sucess:true}
      res.send(JSON.stringify(responseToDelete));

      console.log("deleteSucessfully");
    }
  });
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});