import fs from "fs";

export default {
  strFromFile: (path, options = { createOnNotFound: false, defaultContent: "" }) => {
    try {
      return fs.readFileSync(path).toString();
    } catch (err) {
      if (options.createOnNotFound) {
        fs.writeFileSync(path, options.defaultContent)
      }

      return options.defaultContent;
    }
  }
}