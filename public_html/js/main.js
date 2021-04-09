const textUtil = new function(){
    this.isOpener = function(char){
        return char === '{' || char === '[';
    };
    this.isCloser = function(char){
        return char === '}' || char === ']';
    };
    this.isDelimiter = function(char){
        switch(char){
            case '{':
            case '}':
            case '[':
            case ']':
            case ',':
                return true;
            default:
                return false;
        }
    };
    this.isSkip = function(char){
        return char === '"' || char === "'";
    };
    this.isEscape = function(char){
        return char === '\\';
    };
    this.tab = function(indent){
        return ' ';//.repeat((indent - 1)*4);
    };
};

const tokenize = (text) =>{//{"fields":[1,2,3],"thing1":67,"thing2":"mopey"}
    let tokens = [];
    let skip = false;
    let escape = 0;
    let j = 0;
    for (var i = 0; i < text.length; i++) {
        if(textUtil.isEscape(text[i])){
            escape = 2;
        }
        if(0 >= escape--){
            if(textUtil.isSkip(text[i])){
                skip = !skip;
            }
            else if(!skip && textUtil.isDelimiter(text[i])){
                if(j !== i){
                    tokens.push({'t':[text.substring(j, i)], 'ind':0});
                }
                tokens.push({'t':[text.substring(i, i + 1)], 'ind':0});
                j = i + 1;
            }
        }
    }
    if(j !== i){
        tokens.push({'t':[text.substring(j, i)], 'ind':0});
    }
    //console.log(tokens);
    return tokens;
};
const mergeComma = (tokens) => {
    let newTokens = [];
    let j = 0;
    let prev = tokens[0];
    newTokens[0] = prev;
    for (var i = 1; i < tokens.length; i++){
        let curr = tokens[i];
        if(curr === undefined || curr.t[0].trim().length === 0){
            continue;
        }
        if(curr.t[0] === ','){
            prev.t.push(curr.t[0]);
        }
        else{
            newTokens[j] = curr;
            prev = curr;
            j++;
        }
    }
    return newTokens;
};
const setIndents = (tokens) =>{//{"fields":[1,2,3],"thing1":67,"thing2":"mopey"}
    let newTokens = [];
    let indent = 1;
    for (var i = 0; i < tokens.length; i++){
        let curr = tokens[i];
        if(textUtil.isOpener(curr.t[0])){
            tokens[i].ind = indent;
            indent++;
        }
        else if(textUtil.isCloser(curr)){
            indent--;
            tokens[i].ind = indent;
        }
        else{
            tokens[i].ind = indent;
        }
    }
    return newTokens;
};
const mergeOChar = (tokens) =>{
    let newTokens = [];
    let j = 0;
    let prev = tokens[0];
    newTokens[0] = prev;
    for (var i = 1; i < tokens.length; i++){
        let curr = tokens[i];
        console.log("curr: "+curr.t);
        if(i > 0 && curr.t[0] === '{' && !textUtil.isDelimiter(prev.t.slice(-1)[0])){
            prev.t.push(curr.t[0]);
            console.log("^^");
        }
        else{
            newTokens[j] = curr;
            prev = curr;
            j++;
            console.log("--");
        }
    }
    return newTokens;
};
const buildStrings = (tokens) =>{//{"fields":[1,2,3],"thing1":67,"thing2":"mopey"}
    for (var i = 0; i < tokens.length; i++){
        let curr = tokens[i];
        tokens[i] = textUtil.tab(curr.ind) + curr.t.join("");
    }
    return tokens;
};
const handleText = () =>{
    let text = document.getElementById('textIn').value;
    text = text.replaceAll(/\r?\n|\r/g, "");
    let tokens = tokenize(text);
    if(tokens.length){
//        tokens = mergeComma(tokens);
//        tokens = setIndents(tokens);
//        tokens = mergeOChar(tokens);
        tokens = buildStrings(tokens);
    }
    console.log("DONE");
    console.log(tokens.join('\n'));
    document.getElementById("textOut").value = tokens.join('\n');
};
/*
{"menu": {
  "id": "file",
  "value": "File",
  "popup": {
    "menuitem": [
      {"value": "New", "onclick": "CreateNewDoc()"},
      {"value": "Open", "onclick": "OpenDoc()"},
      {"value": "Close", "onclick": "CloseDoc()"}
    ]
  }
}}
 */