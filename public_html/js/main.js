const TokenFactory = (() => {
	let uq = 1;
	
	/*private*/ const getUq = () => {
		return ++uq;
	};
	/*private*/ const getProto = (setValue, linkFunction) => {
		let id = getUq();
		
		return {
			className : "charDelim",// CSS class for token color
			id : id,				// id for highlighting on click
			isOpener : false,		// true for {[
			isCloser : false,		// true for }]
			isValue : false,		// true for any non-key text, number or boolean
			checkEndline : false,	// true if token can be first in the current line (DomProxy adds newLine if needed)
			isEndline : false,		// true if token can be last in the current line (drawFormatted() passes request to next token)
			isColon : false,		// true for :
			isErr: false,			// to be set by errChecker
			indent : 0,				// set by setIndents()
			counterpart : undefined,// openers reference closers and vice versa; other tokens leave this undefined 
			domObject : undefined,	// a reference to the dom object so it can be modified from the AppState.currTokens list
			value : setValue,		// text content
			formatted : "",			// DomProxy puts a non-html copy of the formatting here for clipboard
			onClick :  () => {// Calls a handler either to highlight tokens or clear all
				linkFunction(id);
			}
		};
	};
	const getTokenOpen = (setValue) => {// for {[
		return {
			...getProto(setValue, FormatUtil.linkView),
			isOpener: true,
			checkEndline: true,
			isEndline: true,
		};
	};
	const getTokenClose = (setValue) => {// for }]
		return {
			...getProto(setValue, FormatUtil.linkView),
			isCloser: true,
			checkEndline: true,
			isEndline: true,
		};
	};
	const getComma = () => {
		return {
			...getProto(",", FormatUtil.unlinkView),
			isEndline: true,
		};
	};
	const getColon = () => {
		return {
			...getProto(":", FormatUtil.unlinkView),
			isColon: true,
		};
	};
	const getTokenKey = (setValue) => {
		return {
			...getProto(setValue, FormatUtil.unlinkView),
			className: "charKey",
			checkEndline: true,
		};
	};
	const getTokenValue = (setValue) => {
		return {
			...getProto(setValue, FormatUtil.unlinkView),
			className: "charValue",
			isValue: true,
			checkEndline: true,
			isEndline: true,
		};
	};
	const getTokenNumValue = (setValue) => {
		return {
			...getProto(Number(setValue), FormatUtil.unlinkView),
			className: "charNumValue",
			isValue: true,
			checkEndline: true,
			isEndline: true,
		};
	};
	const getTokenBoolValue = (setValue) => {
		const value = (setValue === 'true')? true:false;
		return {
			...getProto(value, FormatUtil.unlinkView),
			className: "charBoolValue",
			isValue: true,
			checkEndline: true,
			isEndline: true,
		};
	};
	
	return {
		getTokenOpen: (setValue) => getTokenOpen(setValue),
		getTokenClose: (setValue) => getTokenClose(setValue),
		getComma: () => getComma(),
		getColon: () => getColon(),
		getTokenKey: (setValue) => getTokenKey(setValue),
		getTokenValue: (setValue) => getTokenValue(setValue),
		getTokenNumValue: (setValue) => getTokenNumValue(setValue),
		getTokenBoolValue: (setValue) => getTokenBoolValue(setValue)
	};
})();

const Flags = (() => {
	let errState = false;
	let fixedEqualSign = false;
	let hideWindow = false;
	let powerOn = true;
	let confirmSave = false;
	
	const toggleHide = () => {
		hideWindow = !hideWindow;
		DomProxy.renderHideButton(hideWindow);
		DomProxy.hideWindow(hideWindow);
	}
	const togglePowerButton = () => {
		powerOn = !powerOn;
		DomProxy.renderPowerButton(powerOn);
		Parser.parse();
	}
	
	const setConfirmSave = (newState) => {
		confirmSave = newState;
		DomProxy.renderSaveButton(newState);
	}
	
	return {
		setErr: (newState) => errState = newState,
		isErr: () => errState,
		setFixedEqualSign: (newState) => fixedEqualSign = newState,
		isFixedEqualSign: () => fixedEqualSign,
		toggleHide: () => toggleHide(),
		togglePowerButton: () => togglePowerButton(),
		isPowerOn: () => powerOn,
		setConfirmSave: (newState) => setConfirmSave(newState),
		isConfirmSave: () => confirmSave
	};
})();

const AppState = (() => {
	const stack = [];		// strings
	let currTokens = [];	// token objects
	let pointer = 0;
	
	/*private*/ const incPointer = () => {
		pointer = Math.min(pointer + 1, stack.length - 1);
		DomProxy.renderPointerPos(pointer, stack.length);
	}
	/*private*/ const decPointer = () => {
		pointer = Math.max(pointer - 1, 0);
		DomProxy.renderPointerPos(pointer, stack.length);
	}
	const save = (text) => { 
		stack[pointer] = text;
	}
	const push = (text) => { 
		stack.push(text);
		pointer = stack.length - 1;
		DomProxy.renderPointerPos(pointer, stack.length);
	}
	const back = () => { 
		decPointer();
		return stack[pointer];
	}
	const forward = () => { 
		incPointer();
		return stack[pointer];
	}
	const top = () => { 
		pointer = stack.length - 1;
		DomProxy.renderPointerPos(pointer, stack.length);
		return stack[pointer];
	}
	const pop = () => {
		stack.pop();
		if(stack.length){
			return top();
		}
		else {
			return "";
		}
	}
	
	return {
		save: (text) => save(text),
		push: (text) => push(text),
		back: () => back(),
		forward: () => forward(),
		top: () => top(),
		pop: () => pop(),
		haveState: () => !!stack.length,
		setTokens: (newTokens) => currTokens = newTokens,
		haveTokens: () => !!currTokens.length,
		getTokens: () => currTokens,
	};
})();

const DomProxy = (() => {
	const appendText = (domParent, token, isEndline) => {
		let domChild = document.createElement("DIV");
		
		if(token.isErr) {
			domChild.classList.add("err");
		}
		else {
			domChild.classList.add(token.className);
		}
		
		domChild.addEventListener("click", token.onClick);
		token.domObject = domChild;
		
		if(token.checkEndline && isEndline){
			domParent.appendChild(document.createElement("BR"));
			domChild.innerHTML = FormatUtil.tabHtml(token.indent) + token.value;
			
			token.formatted = "\n" + FormatUtil.tabSpace(token.indent) + token.value;
		}
		else{
			domChild.innerHTML = token.value;
			
			token.formatted = token.value;
		}
		domParent.appendChild(domChild);
	};
	const getOrigTextValue = () => {
		return document.getElementById('origText').value;
	}
	const setOrigTextValue = (text) => {
		document.getElementById('origText').value = text;
	}
	const getFormatDiv = () => {
		return document.getElementById("formatOut");
	}
	const clearFields = () => {
		document.getElementById("origText").value = "";
		document.getElementById("formatOut").innerHTML = "";
		document.getElementById("objSize").innerHTML = "";
	}
	const renderObjSize = (objSize) => {
		let d = document.getElementById('objSize').innerHTML = (objSize)? `(${objSize})` : "";
	}
	const renderPointerPos = (pointer, length) => {
		document.getElementById("pointerPos").innerHTML = `${pointer+1}/${length}`;
	}
	const renderHideButton = (hide) => {
		document.getElementById("buttonHide").value = (hide)? "+":"-";
	}
	const renderPowerButton = (powerOn) => {
		const b = document.getElementById("buttonPower");
		b.value = (powerOn)? `\u{23FB}` : `\u{23FC}`;
		b.className = (powerOn)? "" : "bgRed";
	}
	/*private*/ const clearOnOutClick = (e) => {
		if(!document.getElementById("buttonSave").contains(e.target)){
			console.log("reset")
			Flags.setConfirmSave(false);
		}
	};
	const renderSaveButton = (newState) => {
		const buttonSave = document.getElementById("buttonSave");
		if(newState){
			buttonSave.className = "bgRed";
			buttonSave.title = "Overwrite?";
			document.addEventListener("click", clearOnOutClick, false);
		}
		else{
			buttonSave.className = "";
			buttonSave.title = "Save";
			document.removeEventListener("click", clearOnOutClick, false)
		}
	}
	const hideWindow = (hide) => {
		document.getElementById("origText").style.maxHeight = (hide)? "20px":"500px";
	}
	/*private*/ const toClipboard = (text) => {
		let temp = document.createElement("textarea");
		document.body.appendChild(temp);
		temp.value = text;
		temp.select();
		document.execCommand("copy");
		document.body.removeChild(temp);
		document.getElementById('origText').focus();
	};
	const origToClipboard = () => {
		document.getElementById('origText').select();
		document.execCommand("copy");
	}

	const escapedToClipboard = () => {
		let text = getOrigTextValue();
		text = text.replaceAll(/["]/g, '\\"');
		toClipboard(text);
	}

	const formattedToClipboard = () => {
		if(AppState.haveTokens()){
			let formatted = [];
			for(const token of AppState.getTokens()){
				formatted.push(token.formatted);
			}
			toClipboard(formatted.join(""));
		}
	}
	
	return {
		appendText: (domParent, token, isEndline) => appendText(domParent, token, isEndline),
		getOrigTextValue: () => getOrigTextValue(),
		setOrigTextValue: (text) => setOrigTextValue(text),
		getFormatDiv: () => getFormatDiv(),
		clearFields: () => clearFields(),
		renderObjSize: (newCount) => renderObjSize(newCount),
		renderPointerPos: (pointer, length) => renderPointerPos(pointer, length),
		renderHideButton: (hide) => renderHideButton(hide),
		renderPowerButton: (powerOn) => renderPowerButton(powerOn),
		renderSaveButton: (newState) => renderSaveButton(newState),
		hideWindow: (hide) => hideWindow(hide),
		origToClipboard: () => origToClipboard(),
		escapedToClipboard: () => escapedToClipboard(),
		formattedToClipboard: () => formattedToClipboard()
	}
})();

const TextUtil = (() => {
    const readCharacter = (character, id) => {
        switch(character){
            case '{':
            case '[':
				return TokenFactory.getTokenOpen(character, id);
			case '}':
            case ']':
				return TokenFactory.getTokenClose(character, id);
            case ',':
                return TokenFactory.getComma();
            case ':':
                return TokenFactory.getColon();
            default:
                return false;
        }
    };
	const readKeyValToToken = (text, delimToken) => {
		return (delimToken && delimToken.isColon)? readKeyToToken(text) : readValueToToken(text);
	};
	const readKeyToToken = (text) => {
		return (isQuoted(text))? TokenFactory.getTokenKey(text) : TokenFactory.getTokenKey('"' + text + '"');
	};
	const readValueToToken = (text) => {
		if(isQuoted(text)){
			return TokenFactory.getTokenValue(text);
		}
		else if(isNumeric(text)){
			return TokenFactory.getTokenNumValue(text);
		}
		else if(isBoolean(text)){
			return TokenFactory.getTokenBoolValue(text);
		}
		else {
			return TokenFactory.getTokenValue('"' + text + '"');
		}
	};
    const isQuoted = (text) => {
        return text.length > 1 && text[0] === '"' || text[text.length - 1] === "'";
    };
    const isNumeric = (text) => {
        return !isNaN(text) && !isNaN(parseFloat(text));
    };
    const isBoolean = (text) => {
        return text === "true" || text === "false";
    };
    const isQuotedJson = (text) => {
        return text.length > 3 && text[0] === '"' || text[text.length - 1] === "'" && 
			((text[1] === '{' || text[text.length - 2] === "}") || (text[1] === '[' || text[text.length - 2] === "]"));
    };
    const clearQuotedJson = (text) => {
        return (isQuotedJson(text))? text.substring(1, text.length - 1) : text;
    };
	const removeChars = (text) => {
		const charList = [' ','\t','\n','\r'];
		const dest = [];
		let skip = false;
		
		for(let i = 0; i < text.length; i++) {
			if(text[i] === '"'){
				skip = !skip;
				dest.push(text[i]);
			}
			else if(skip || !charList.includes(text[i])){
				dest.push(text[i]);
			}
		}
		return (dest.length === text.length)? text: dest.join("");
	};
	const fixBadEqualSign = (text) => {// for fixJavaNotation
		const charList = [' ','\t','\n','\r'];
		const dest = [];
		let skip = false;
		let changed = false;
		
		for(let i = 0; i < text.length; i++) {
			if(text[i] === '"'){
				skip = !skip;
				dest.push(text[i]);
			}
			else if(text[i] !== "=" || skip){
				dest.push(text[i]);
			}
			else{
				dest.push(":");
				Flags.setFixedEqualSign(true);
			}
		}

		return (Flags.isFixedEqualSign())? dest.join(""): text;
	};
	
	return {
		readCharacter: (character, id) => readCharacter(character, id),
		readKeyValToToken: (text, delimToken) => readKeyValToToken(text, delimToken),
		readKeyToToken: (text) => readKeyToToken(text),
		readValueToToken: (text) => readValueToToken(text),
		isQuoted: (text) => isQuoted(text),
		isNumeric: (text) => isNumeric(text),
		isBoolean: (text) => isBoolean(text),
		isQuotedJson: (text) => isQuotedJson(text),
		clearQuotedJson: (text) => clearQuotedJson(text),
		removeChars: (text) => removeChars(text),
		fixBadEqualSign: (text) => fixBadEqualSign(text)
	};
})();

const FormatUtil = (() => {
	const TAB_WIDTH = 4;
	const CHARS = {
		"{" : "}",
		"[" : "]"
	};
	
    const tabHtml = (indent) => {
        return (indent > 0)? '&nbsp;'.repeat(indent*TAB_WIDTH) : "";
    };
    const tabSpace = (indent) => {
        return (indent > 0)? ' '.repeat(indent*TAB_WIDTH) : "";
    };
	const setIndents = (tokens) => {
		let indent = 0;
		
		for (var i = 0; i < tokens.length; i++){
			if(tokens[i].isOpener){
				tokens[i].indent = indent;
				indent++;
			}
			else if(tokens[i].isCloser){
				indent--;
				tokens[i].indent = indent;
			}
			else{
				tokens[i].indent = indent;
			}
		}
	};
	/*private*/ const isValidCounterpart = (opener, closer) => {
		return closer === CHARS[opener];
	};
	const setCounterparts = (tokens) => {
		const stack = [];
		
		for (var i = 0; i < tokens.length; i++){
			if(tokens[i].isOpener){
				stack.push(tokens[i]);
			}
			else if(tokens[i].isCloser){
				const closer = tokens[i];
				
				if(stack.length){
					const opener = stack.pop();
					
					if(isValidCounterpart(opener.value, closer.value)){
						opener.counterpart = closer;
						closer.counterpart = opener;
					}
					else{
						opener.isErr = true;
						closer.isErr = true;
						Flags.setErr(true);
					}
				}
				else{
					closer.isErr = true;
					Flags.setErr(true);
				}
			}
		}
	};
	const drawFormattedHtml = (tokens) => {
		let isEndline = false;
		let div = DomProxy.getFormatDiv();
		div.innerHTML = "";
		
		for (var i = 0; i < tokens.length; i++){
			DomProxy.appendText(div, tokens[i], isEndline);
			isEndline = tokens[i].isEndline;
		}
	};
	const linkView = (id) => {
		if(!Flags.isErr()){
			unlinkView();
			for(const token of AppState.getTokens()){
				if(token.id == id){
					token.domObject.setAttribute("class", "");
					token.domObject.classList.add("highlight");
					if(token.counterpart){
						token.counterpart.domObject.setAttribute("class", "");
						token.counterpart.domObject.classList.add("highlight");
					}
				}
			}
		}
	};
	const unlinkView = () => {
		for(const token of AppState.getTokens()){
			if(token.id > 0){
				token.domObject.setAttribute("class", "");
				token.domObject.classList.add(token.className);
			}
		}
	};
	
	return {
		tabHtml: (indent) => tabHtml(indent),
		tabSpace: (indent) => tabSpace(indent),
		setIndents: (tokens) => setIndents(tokens),
		setCounterparts: (tokens) => setCounterparts(tokens),
		drawFormattedHtml: (tokens) => drawFormattedHtml(tokens),
		linkView: (id) => linkView(id),
		unlinkView: () => unlinkView()
	}
})();

const Parser = (() => {
	/*private*/ const tokenize = (text) => {
		let tokens = [];
		let skip = false;

		let j = 0;
		for (var i = 0; i < text.length; i++) {
			if(text[i] === '"'){
				skip = !skip;
			}
			else if(!skip) {
				let delimToken = TextUtil.readCharacter(text[i]);
				
				if(delimToken !== false){
					if(j !== i){
						tokens.push(
							TextUtil.readKeyValToToken(text.substring(j, i), 
							delimToken)
						);
					}
					tokens.push(delimToken);
					
					j = i + 1;
				}
			}
		}
		if(j !== i){
			tokens.push(
				TextUtil.readKeyValToToken(text.substring(j, i), 
				false)
			);
		}
		return tokens;
	};
	const fixJavaNotation = (tokens) => {
		if(Flags.isFixedEqualSign()){
			const remove = [];
			
			for(let i = 1; i < tokens.length; i++){
				const curr = tokens[i];
				
				if(curr.isOpener){
					const prev = tokens[i - 1];
					if(prev.isValue){
						remove.push(i - 1)
					}
				}
			}
			
			if(remove.length){
				return tokens.filter((t, i) => !remove.includes(i));
			}
		}
		return tokens;
	}
	/*private*/ const setObjSize = (tokens) => {
		DomProxy.renderObjSize(
			tokens.reduce((acc, t) => t.isValue ? ++acc : acc, 0)
		);
	}
	const parse = () => {
		Flags.setErr(false);
		
		const origText = DomProxy.getOrigTextValue();
		
		if(!origText.length){
			return;
		}
		
		let text = origText.replaceAll(/[\\]["]/g, '"');
		text = TextUtil.clearQuotedJson(text);
		text = TextUtil.removeChars(text);
		text = TextUtil.fixBadEqualSign(text);
		
		let tokens = tokenize(text);
		tokens = fixJavaNotation(tokens);
		Flags.setFixedEqualSign(false);
		
		setObjSize(tokens);
		
		FormatUtil.setIndents(tokens);
		FormatUtil.setCounterparts(tokens);
		FormatUtil.drawFormattedHtml(tokens);
		AppState.setTokens(tokens);
		
		if(Flags.isPowerOn()){
			DomProxy.setOrigTextValue(text);
		}
	};
	
	return {
		parse: () => parse()
	};
})();

// event handlers
const clearFields = () => {
	DomProxy.clearFields();
}

const toggleHide = () => {
	Flags.toggleHide();
}

const togglePowerButton = () => {
	Flags.togglePowerButton();
}

const slideFormatted = () => {
	let formattedString = AppState.getTokens().map(
		t => t.formatted
	).join("");
	
	DomProxy.setOrigTextValue(formattedString);
	Parser.parse();
}

const stateSave = () => {
	const text = DomProxy.getOrigTextValue();
	
	if(text.length){
		if(AppState.haveState()){
			if(Flags.isConfirmSave()){
				Flags.setConfirmSave(false);
				AppState.save(text);
			}
			else {
				Flags.setConfirmSave(true);
			}
		}
		else {
			AppState.push(text);
		}
	}
	else{
		Flags.setConfirmSave(false);
	}
}

const statePush = () => {
	const text = DomProxy.getOrigTextValue();
	if(text.length){
		AppState.push(text);
	}
}

const stateBack = () => {
	if(AppState.haveState()){
		DomProxy.setOrigTextValue(AppState.back());
		Parser.parse();
	}
}

const stateForward = () => {
	if(AppState.haveState()){
		DomProxy.setOrigTextValue(AppState.forward());
		Parser.parse();
	}	
}

const stateTop = () => {
	if(AppState.haveState()){
		DomProxy.setOrigTextValue(AppState.top());
		Parser.parse();		
	}	
}

const statePop = () => {
	if(AppState.haveState()){
		DomProxy.setOrigTextValue(AppState.pop());
		Parser.parse();		
	}	
}

const origToClipboard = () => {
	DomProxy.origToClipboard();
}

const escapedToClipboard = () => {
	DomProxy.escapedToClipboard();
}

const formattedToClipboard = () => {
	DomProxy.formattedToClipboard();
}

/*
Test Data Short:
{"fields":[1,2,3],"thing1":{"innerThing":23},"thing2":"mopey"}

Test Data Long:
{"menu": {"id": "file","value": "File","popup": {"menuitem": [{"value": "New", 
"onclick": "CreateNewDoc()"},{"value": "Open", "onclick": "OpenDoc()"},{"value": 
"Close", "onclick": "CloseDoc()"} ]}}}

Escaped
{\"fields\":[1,2,3],\"thing1\":{\"innerThing\":23},\"thing2\":\"mopey\"}


Tab and new line (Due to HTML, multi-space only shows up when format copied to clipboard)
{a:		b,c    :d 
, e: "in	quotes 		tabs"}


Unnecessary quotes
"{"fields":[1,2,3],"thing1":{"innerThing":23},"thing2":"mopey"}"

Booleans and Numbers
{thing:{"id":"file","value":"File","popup":{"menuitem":[{"value":false,"onclick":"doIt()"},{"value":-00033.60000,"onclick":"OpenDoc()"},{"value":true,"onclick":"CloseDoc()"}]}}}

Java map and toString() notation
[objectName{key1=value1, key2=value2, key3="keep the = sign"}]

Ignore map-like mistake
[objectName{key1:value1, key2:value2, key3="keep the = sign"}]
 */
