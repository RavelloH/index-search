const indexSearch = require("./index");

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

indexSearch.index();