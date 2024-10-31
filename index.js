import express from "express";
import fs from "fs";
import Handlebars from "handlebars";

const app = express();
const port = 3000;

import { dirname, join as pathJoin } from "node:path";
import { fileURLToPath } from "node:url";
import path from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use("/public", express.static("public"));

const strFromFile = (path) => fs.readFileSync(path).toString();

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
  header : Handlebars.registerPartial("header",
    strFromFile(pathJoin(__dirname, "views", "partials", "header.html"))
  ),
  footer : Handlebars.registerPartial("footer",
    strFromFile(pathJoin(__dirname, "views", "partials", "footer.html"))
  ),
  navigation : Handlebars.compile(
    strFromFile(pathJoin(__dirname, "views", "partials", "nav.hbs")))
};

const dataTitleRegister = JSON.parse(
  strFromFile(pathJoin(__dirname, "public", "titleRegister.json"))
);
const sendNavigation = partials.navigation({navSection: Object.keys(dataTitleRegister)});

app.get("/", (req, res) => {
 let titleSelector=[];
 console.log(dataTitleRegister);
 console.log(typeof(dataTitleRegister));
 let listSection = Object.keys(dataTitleRegister);

 console.log(listSection);

 listSection.forEach(oneSection => {
    const sectionSize = dataTitleRegister[oneSection].length;
    let randomSelector = Math.floor(Math.random()*sectionSize);

    titleSelector.push({"sectionName":oneSection,
    "sectionLength":sectionSize,
    "sectionRandomTitle":dataTitleRegister[oneSection][randomSelector].title,
    "sectionRandomDate":dataTitleRegister[oneSection][randomSelector].additionDate,
    "sectionRandomNotes":dataTitleRegister[oneSection][randomSelector].notes
 })

 });
  console.log(titleSelector);
  
  res.send(views.index({navigation: sendNavigation , section: titleSelector }));
});

app.get("/section/:sectionName", (req, res) => {
  const section = dataTitleRegister[req.params.sectionName];

  res.send(
    views.section({
      navigation: sendNavigation,
      name: req.params.sectionName,
      piece: section,
    })
  );
});

app.get("/add", (req, res) => {
  res.send(views.add({navigation: sendNavigation}));

});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
