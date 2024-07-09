const books = {
    addButton: document.getElementById("addBook"),
    bookname: document.getElementById("bookname"),
    horizontal: document.getElementById("horizontal"),
    vertical: document.getElementById("vertical"),
    depth: document.getElementById("depth"),
    
   list :[],

    init: function () {
        this.addButton.addEventListener("click", () => this.AddBook());
    },

    AddBook: function () {
        const b = new book(this.bookname.value, this.horizontal.value, this.vertical.value, this.depth.value);
        b.Debug();
        this.list.push(b);
        // フォームをリセットする
        document.getElementById('bookInfo').reset();

    }
}
books.init();

class book
{
    bookname = "";
    horizontal = 0;
    vertical = 0;
    depth = 0;
    count = 1;

    constructor(bookname, horizontal, vertical, depth) {
        this.bookname = bookname;
        this.horizontal = Number(horizontal);
        this.vertical = Number(vertical);
        this.depth = Number(depth);
    }

    Debug = function () {
        console.log(`${this.bookname}/${this.horizontal}/${this.vertical}/${this.depth}`);
    }

    GetDesc = function () {
        return `${this.bookname}/${this.horizontal}mm x ${this.vertical}mm x ${this.depth}mm`;
    }
}