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
        return (indent > 0)? ' '.repeat(indent*4) : "";
    };
};

const tokenize = (text) => {
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
    return tokens;
};
const setIndents = (tokens) => {
    let indent = 0;
    for (var i = 0; i < tokens.length; i++){
        let curr = tokens[i];
        if(textUtil.isOpener(curr.t[0])){
            tokens[i].ind = indent;
            indent++;
        }
        else if(textUtil.isCloser(curr.t[0])){
            indent--;
            tokens[i].ind = indent;
        }
        else{
            tokens[i].ind = indent;
        }
    }
    return tokens;
};
const merge = (tokens) => {
    let newTokens = [];
    let prev = tokens[0];
	let j = 0;
    newTokens[j++] = prev;
    for (var i = 1; i < tokens.length; i++){
        let curr = tokens[i];
        if(curr === undefined || curr.t[0].trim().length === 0){
            continue;
        }
        if(curr.t[0] === ','){
            prev.t.push(curr.t[0]);
        }
		else if(
			curr.t[0] === '{' && 
			!textUtil.isDelimiter(prev.t[prev.t.length - 1])
		){
            prev.t.push(curr.t[0]);
        }
        else{
            newTokens[j++] = curr;
        }
		prev = curr;
    }
    return newTokens;
};
const buildStrings = (tokens) => {
    for (var i = 0; i < tokens.length; i++){
        let curr = tokens[i];
        tokens[i] = textUtil.tab(curr.ind) + curr.t.join("");
    }
    return tokens;
};
const handleText = () => {
    let text = document.getElementById('textIn').value;
    text = text.replaceAll(/\r?\n|\r/g, "");
	document.getElementById("escapeOut").value = escapeText(text);
	
    let tokens = tokenize(text);
    if(tokens.length){
        tokens = buildStrings(
			merge(
				setIndents(tokens)
			)
		);
    }
    document.getElementById("textOut").value = tokens.join('\n');
};
const escapeText = (text) => {
	return text.replaceAll(/["]/g, '\\"')
}
const clearFields = () => {
	document.getElementById("textIn").value = "";
	document.getElementById("escapeOut").value = "";
	document.getElementById("textOut").value = "";
}
/*
Test Data Short:

{"fields":[1,2,3],"thing1":{"innerThing":23},"thing2":"mopey"}

Test Data Long:

{"menu": {"id": "file","value": "File","popup": {"menuitem": [{"value": "New", 
"onclick": "CreateNewDoc()"},{"value": "Open", "onclick": "OpenDoc()"},{"value": 
"Close", "onclick": "CloseDoc()"} ]}}}
 */
