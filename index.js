const RLog = require("rlog-js");
const rlog = new RLog();
const path = require("path");
const fs = require("fs");

const indexSearch = {
  config: {
    outputFolder: "search",
  },
  index: async function () {
    rlog.info("Prepare for indexing...");

    if (this.data.length === 0) {
      rlog.error("No data found");
      return;
    }

    if (Object.keys(this.result).length > 0) {
      rlog.warning("Result is not empty, clearing...");
      this.result = {};
    }

    if (fs.existsSync(this.config.outputFolder)) {
      rlog.warning("Output folder exists, clearing...");
      fs.rmSync(this.config.outputFolder, { recursive: true });
    }

    rlog.info(`Active index: ${this.data.length} items`);
    rlog.info("Start indexing...");
    this.result.srcDB = [];
    this.result.charDB = {};

    this.data.forEach((item, index) => {
      let content = item.content.toLowerCase().replace(/[^\w\s\u4e00-\u9fa5]/gi, "").replace(/\s/g, "");
      const src = item.src;

      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (!this.result.charDB[char]) {
          this.result.charDB[char] = [];
        }
        if (!this.result.srcDB.includes(src)) {
          this.result.srcDB.push(src);
        }
        const srcIndex = this.result.srcDB.indexOf(src);
        let charEntry = this.result.charDB[char].find(entry => entry.src === srcIndex);
        if (!charEntry) {
          charEntry = { src: srcIndex, index: [] };
          this.result.charDB[char].push(charEntry);
        }
        charEntry.index.push(i);
      }
      rlog.progress(index + 1, this.data.length);
    });

    rlog.success("Indexing completed");
    rlog.info("Start to save index data...");

    const charDBKeys = Object.keys(this.result.charDB);
    const length = charDBKeys.length;

    charDBKeys.forEach((key, index) => {
      const data = this.result.charDB[key];
      const result = {
        data
      };

      result.data.forEach(entry => {
        entry.src = this.result.srcDB[entry.src];
      });

      const filePath = path.join(this.config.outputFolder, `${key}.json`);
      if (!fs.existsSync(this.config.outputFolder)) {
        fs.mkdirSync(this.config.outputFolder);
      }
      fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
      rlog.progress(index + 1, length);
    });

    rlog.success("Index data saved");
  },
  result: {},
  data: [],
};

module.exports = indexSearch;
