# index-search
单字字典倒排式关联索引的静态资源搜索方案。

曾经我做过[RavelloH/RPageSearch](https://github.com/RavelloH/RPageSearch)，也是静态站的全文搜索引擎，实现方式是先把所有资源拉取到本地，由js进行搜索。优点是只需要静态资源托管，不需要服务器参与运算，但是效率太低，内容多了之后文件大小爆炸。

这个项目是一个改进版，将每个字作为键来索引文章，会生成<全文中字的种类>个json，每个json中记录某个字在某篇文章的某个部分出现，前端只需要请求<搜索词长度>次即可进行搜索，而不用获取全文。

尤其适合中文这种字种多的语言，对纯英文用处不大。主要对“不是每篇文章都能用到”的字有效果，且作为索引，只能告诉你哪个内容中有你输入的搜索词，要获取那篇文章的全文需要再自行请求。

典型情况下，中文新闻语料库[RavelloH/EverydayNews](https://github.com/RavelloH/EverydayNews)的data文件夹大小为1,738,276字节(1.65MB)时，会生成25,184,701(24.0MB)字节的索引，包含3773个json文件，平均每个文件的大小为6674字节(6.51KB)，需要请求的文件大小降低至原来的(字数*6674)/1738276。典型赋值，字数为2-10时，降低至原来的0.0076-0.0383倍，提升高达2610%-13157%，效果显著。

## 示例
[https://ravelloh.github.io/EverydayNews](https://ravelloh.github.io/EverydayNews)

## 使用
先index，再search。

### index
```javascript
const indexSearch = require("index-search");

indexSearch.config.outputFolder = "search"; // 输出文件夹

indexSearch.data = [
    {
        content: "This is a test",
        src: "/test",
    },
    {
        content: "This is another test",
        src: "/test2",
    },
    {
        content: "这是中文字符的测试",
        src: "/中文",
    }
]
// 你也可以使用indexSearch.data.push({content: "content", src: "/src"})等方式来添加数据，顺序无所谓。
// 数据添加完成后，调用index方法即可生成。

indexSearch.index();
```

### search
前端搜索的方法很多，下面放一个我写的，仅供参考。  
这个方法会返回一个数组，包含所有匹配的src，按时间(1900/01/01)降序排列。你可以按照自己的path的形式自己调整。
```javascript
async function search(words) {
  const charDataList = [];
  for (const char of words) {
    try {
      const res = await fetch(`/search/${char}.json`); // 这里的路径要根据你的实际情况调整
      const json = await res.json();
      charDataList.push(json.data);
    } catch (error) {
      console.error(`Error fetching ${char}:`, error);
    }
  }

  const resultMap = {};
  charDataList.forEach((charData, idx) => {
    charData.forEach((item) => {
      const { src, index: positions } = item;
      if (!resultMap[src]) {
        resultMap[src] = Array(charDataList.length)
          .fill(null)
          .map(() => []);
      }
      resultMap[src][idx] = positions;
    });
  });

  const matched = [];
  for (const src in resultMap) {
    const indicesArr = resultMap[src];
    if (indicesArr.every((arr) => arr.length > 0)) {
      let found = false;
      indicesArr[0].forEach((pos) => {
        let consecutive = true;
        for (let i = 1; i < indicesArr.length; i++) {
          if (!indicesArr[i].includes(pos + i)) {
            consecutive = false;
            break;
          }
        }
        if (consecutive) found = true;
      });
      if (found) matched.push(src);
    }
  }

  // 下面是按时间降序排列，删了也没问题，自己调整排序方式
  matched.sort((a, b) => {
    const [ay, am, ad] = a.split("/");
    const [by, bm, bd] = b.split("/");
    return new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad);
  });

  return matched;
}

```
不过上面的是同步进行的搜索，网络情况较差的话可能需要较长时间。下面是改成并发的版本：
```js
async function search(words) {
  if (!Array.isArray(words)) {
    words = words.split('');
  }
  const total = words.length;
  const charDataList = [];

  const fetchPromises = words.map(async (char, idx) => {
    try {
      const res = await fetch(`/search/${char}.json`);
      const json = await res.json();
      charDataList[idx] = json.data;
    } catch (error) {
      console.error(`Error fetching ${char}:`, error);
    }
  });

  await Promise.all(fetchPromises);

  const resultMap = {};
  charDataList.forEach((charData, idx) => {
    charData.forEach((item) => {
      const { src, index: positions } = item;
      if (!resultMap[src]) {
        resultMap[src] = Array(charDataList.length)
          .fill(null)
          .map(() => []);
      }
      resultMap[src][idx] = positions;
    });
  });

  const matched = [];
  for (const src in resultMap) {
    const indicesArr = resultMap[src];
    if (indicesArr.every((arr) => arr.length > 0)) {
      let found = false;
      indicesArr[0].forEach((pos) => {
        let consecutive = true;
        for (let i = 1; i < indicesArr.length; i++) {
          if (!indicesArr[i].includes(pos + i)) {
            consecutive = false;
            break;
          }
        }
        if (consecutive) found = true;
      });
      if (found) matched.push(src);
    }
  }

  matched.sort((a, b) => {
    const [ay, am, ad] = a.split("/");
    const [by, bm, bd] = b.split("/");
    return new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad);
  });

  return matched;
}

```
