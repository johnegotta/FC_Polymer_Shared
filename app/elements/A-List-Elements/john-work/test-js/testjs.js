// --GLOBAL VARIABLES--
var fc_firebase_root = 'https://amber-inferno-3827.firebaseio.com';
var fc_questions = { };
var fc_answer_choices = { };
var fc_questions_loaded = false;
var fc_answers_loaded = false;
var theQuestionContextId = "";
var theAnswerContextId = "";
var theOldQuestionContextId = "";
var theOldAnswerContextId = "";
var thePassageContextId = "";
var initFB = false;
var user_info = {};
var test_name = "";
var section_name = "";
var passage_name = "";
var fc_reading_question_tags = {};
var fc_reading_answer_tags = {};
var fc_raw_passages = {};
var fc_passages = {};
var fc_answer_tag_container_id = "";
var fc_question_tag_container_id = "";


function fc_update_firebase_root(argRoot)
{
	fc_firebase_root = argRoot;
}

function FC_Passage(argText, argTestNum, argDouble, argNumQuestions, argAuthor1, argAuthor2, argType)
{
	this.text = argText || "";
	this.testNum = argTestNum || null;
	this.numQuestions = argNumQuestions || 0;
	this.author1 = argAuthor1 || "";
	this.author2 = argAuthor2 || "";
	this.type = argType || "";
	this.double = argDouble || false;
	
	console.log(this);
}

function fc_find_author(argPassageObj)
{
	if(argPassageObj.text == "")
	{
		alert("findAuthor(): Error: text not loaded");
		return 0;
	}
	else
	{
//		var authorMatches = argPassageObj.text.match(/passage ([0-9] )?is (adapted )?from.+?,/i);
		var authorMatches = argPassageObj.text.match(/passage ([0-9] )?is (adapted )?from.+?,/i);
		if(authorMatches != null && authorMatches.length != 0)
		{
			//remove non author parts of regular expression match string
			var fromLocation = authorMatches[0].indexOf("from");
			var authorLocation = fromLocation + 5;
			var commaLocation = authorMatches[0].indexOf(",");
			var andLocation = authorMatches[0].indexOf(" and ");
			if(andLocation == -1)
			{
				//single author
				argPassageObj.author1 = authorMatches[0].slice(authorLocation, commaLocation);
				//alert("found author '" + argPassageObj.author1 + "' for passage " );
			}
			else
			{
				argPassageObj.author1 = authorMatches[0].slice(authorLocation, andLocation);
				argPassageObj.author2 = authorMatches[0].slice(andLocation + 5, commaLocation);
				//alert("found authors '" + argPassageObj.author1 + "' and '" + argPassageObj.author2 + "' for passage ");
			}
		}
	}
}

//creates local objects representing each reading passage and persists them to firebase database
function fc_load_reading_passages()
{
	var i = 0;
	var passageKeys = Object.keys(fc_raw_passages);
	var numPassages = passageKeys.length;
	//alert("fc_load_passages: numPassage = " + numPassages);
	for(i = 1; i <= numPassages; i++)
	{
		var passageId = passageKeys[i-1];
		var passageObj = fc_raw_passages[passageId];
		passageObj.text = passageObj.text.replace(/—/g, " -- ");
		fc_find_author(passageObj);
		fc_persist_obj(passageId, passageObj, "passages");
	}
	//fc_persist_group(fc_passages, "passages");
	var displayArea = document.getElementById('fc_admin_passage_display');
	displayArea.innerHTML = 'Loaded ' + numPassages + ' Passages<br><br>' + fc_raw_passages[passageKeys[0]].text;
}

var FC_Question_Tags =
{
	Summary: false,
	StructureSection: false,
	StructureParagraph: false,
	StructurePurpose: false,
	StructureSpan: false,
	WordReplace: false,
	Plot: false,
	PlotEvidence: false,
	POVPerson: false,
	POVGroup: false,
	VocabularyGeneral: false,
	ToneSingleWord: false,
	ToneSection: false,
	ToneSelection: false
};

var FC_Answer_Tags =
{
	Correct: false,
	EvidenceWrongQuestion: false,
	EvidenceNoEvidence: false,
	EvidenceWrongPassagePart: false,
	EvidenceWrongVoice: false,
	ImpossibilityGrammar: false,
	ImpossibilityLogical: false,
	ImpossibilityTone: false,
	ToneContext: false,
	ToneHyperbolic: false,
	TonePOV: false,
	ToneSummary: false,
	ToneVocab: false,
	VocabContext: false,
	VocabUndefined: false,
	Other: false
};

function fc_load_question_tags()
{
	fc_persist_group(FC_Question_Tags, "reading_question_tags");
}

function fc_load_answer_tags()
{
	fc_persist_group(FC_Answer_Tags, "reading_answer_tags");
}

var FC_QuestionPart = function(argText, argTestNum, argPassageId, argTags)
{
	this.text = argText || "";
	this.testNum = argTestNum || 0;
	this.passageId = argPassageId || 0;
	this.tags = argTags || {};
	//this.startQuote = argStartQ || 0;
	//this.endQuote = argEndQ || 0;
	//this.quote = argQuote || "";
};

function fc_load_reading_sections()
{
	var fb = new Firebase(fc_firebase_root);
	var passagesLoc = fb.child("passages");
	passagesLoc.on("value", function(snapshot){
    		fc_load_passages_from_firebase(snapshot);
		var numTests = 4;
		var i = 0;
		for(i=0; i < numTests; i++)
		{
			var testNum = i + 1;
			var questions = fc_raw_questions_data[i].split(/[1-9][0-9]*\. /g);
			fc_load_reading_section(questions, testNum);
		}
		fc_persist_group(fc_questions, "questions");
		fc_persist_group(fc_answer_choices, "answers");
	});
	
}

function fc_load_reading_section(argQuestionArray, testNum)
{
	var i = 0;
	var j = 0;
	var numPassages = 6;
	var questionNum = 0;
	var numQuestions = argQuestionArray.length;
	//load the passage boundaries in terms of question numbers
	//console.log(fc_passages);
	for(i = 1; i <= numPassages; i++)
	{
		var passageId = "T" + testNum + "S1P" + i;
		//alert("pass = " + passageId + " and fc_passages[pass] = " + fc_passages[passageId]);
		var numQ = fc_passages[passageId].numQuestions;
		alert(numQ + " questions in passage " + passageId);
		for (j = 1; j <= numQ; j++)
		{
			var questionNumString = "T" + testNum + "S1Q";
			questionNum++;
			if(questionNum < 10)
			{
				//always use two digit question number for clear sorting
			 	questionNumString = questionNumString + "0" + questionNum.toString();
			}
			else
			{
				questionNumString += questionNum.toString();
			}
			//alert("about to load " + questionNumString);
			fc_load_question(argQuestionArray[questionNum], questionNumString, passageId);
		}
	}
}

function fc_load_question(argText, argQuestionId, argPassageId)
{
	var questionParts = argText.split(/[A-D]\)/g);
	var testNum = fc_deduce_test_num(argQuestionId);
	fc_questions[argQuestionId] = new FC_QuestionPart(questionParts[0], testNum, argPassageId);
	//fc_persist_obj(fc_questions[questionId], "questions");
	fc_load_answer_choices(questionParts, argQuestionId);
}

function fc_load_answer_choices(argQuestionPartArray, argQuestionId)
{
	var i = 1;
	var letter = "A";
	var numChoices = argQuestionPartArray.length - 1;  //account for question stem in array
	for (i = 1; i <= numChoices; i++)
	{
		var answerChoiceId = argQuestionId + letter; // append letter of choice
		fc_load_answer_choice(argQuestionPartArray[i], answerChoiceId);
		letter = String.fromCharCode(letter.charCodeAt(0) + 1); // increment alpha character
	}
}

function fc_load_answer_choice(argText, argChoiceId)
{
	var testNum = fc_deduce_test_num(argChoiceId);
	fc_answer_choices[argChoiceId] = new FC_QuestionPart(argText, testNum);
	//fc_persist_obj(fc_answer_choices[argChoiceId], "answers");
}

function fc_deduce_test_num(argObjId)
{
	//deduce section from argObjId value
	var testCharLoc = argObjId.indexOf("T");
	var testString = argObjId.slice(testCharLoc, testCharLoc+2);
	testString = testString.replace("T","");
	var testNum = Number(testString);
	return testNum;
}
function fc_init(argQuestionContainerId, argPassageContainerId, argQuestionTagContainerId, argAnswerTagContainerId)
{	
	var wholeFirebase = new Firebase(fc_firebase_root);	
	var reading_question_tags_location = wholeFirebase.child('reading_question_tags');
	var reading_answer_tags_location = wholeFirebase.child('reading_answer_tags');
	var passages_location = wholeFirebase.child('passages');
	var questions_location = wholeFirebase.child('questions');
	var answers_location = wholeFirebase.child('answers');
	fc_answer_tag_container_id = argAnswerTagContainerId;
	fc_question_tag_container_id = argQuestionTagContainerId;
	
	wholeFirebase.onAuth(authDataCallback);
	
    	reading_question_tags_location.on("value", function(snapshot) {
		initializeListOfTags("question", snapshot.val());
		fc_display_tags("question", argQuestionTagContainerId);
    	});
    	
    	reading_answer_tags_location.on("value", function(snapshot) {
		initializeListOfTags("answer", snapshot.val());
		fc_display_tags("answer", argAnswerTagContainerId);
    	});
    	
    	passages_location.on("value", function(snapshot,prevChildKey){
    		fc_load_passages_from_firebase(snapshot);
    		//var new_passage_key = snapshot.key();
    		//var new_passage = snapshot.val();
    		//fc_passages[new_passage_key] = new_passage;
    		questions_location.once("value", function(snapshot) {
			fc_load_subtree_from_firebase(snapshot, "questions");
			fc_questions_loaded = true;
			fc_display_all_questions(argQuestionContainerId);
			questions_location.on("child_changed", function(snapshot){
				var mod_key = snapshot.key();
				fc_questions[mod_key] = snapshot.val();
				fc_update_tag_display();
			});
		});
	
		answers_location.once("value", function(snapshot) {
			fc_load_subtree_from_firebase(snapshot, "answers");
			fc_answers_loaded = true;
			fc_display_all_questions(argQuestionContainerId);
			answers_location.on("child_changed", function(snapshot){
				var mod_key = snapshot.key();
				fc_answer_choices[mod_key] = snapshot.val();
				fc_update_tag_display();
			});
		});
		fc_display_all_passages(argPassageContainerId);
    	});
	
	
}

function fc_load_passages_from_firebase(argSnapshot)
{
	var data = argSnapshot.val();
	for(key in data)
	{
		fc_passages[key] = data[key];
	}
}
function fc_load_subtree_from_firebase(argSnapshot, argSubtree)
{
	var questionData = argSnapshot.val();
	console.log(questionData);
	var keys = Object.keys(questionData);
	console.log(keys);
	var numQ = keys.length;
	var i = 0;
	var objectList = null; // pointer to whichever array/list appropriate
	if(argSubtree == "questions")
	{
		objectList = fc_questions;
	}
	else if(argSubtree == "answers")
	{
		objectList = fc_answer_choices;
	}
	for(i=0; i< numQ; i++)
	{
		var k = keys[i]
		console.log(questionData[keys[i]]);
		objectList[k] = questionData[keys[i]];
	}
//	updateDataAssistant();
}

/*
//line numbered version on hold -- styles all messed up
function fc_display_all_passages(argContainerId)
{
	alert("fc_display_all_passages");
	var numPassages = 6;
	var topLevelContainer = document.getElementById(argContainerId);
	var keys = Object.keys(fc_passages);
	var i = 1;
	for(i=1; i <= numPassages; i++)
	{
		//var pass = fc_display_passage(topLevelContainer, i);
		fc_display_passage(topLevelContainer, i);
		//topLevelContainer.appendChild(pass);
	}
}
*/
function fc_display_all_passages(argContainerId)
{
	//alert("fc_display_all_passages");
	var numTests = 4;
	var topLevelContainer = document.getElementById(argContainerId);
	var i = 1;
	var j = 1;
	for(i=1; i <= numTests; i++)
	{
		var testHeader = document.createElement("h2");
		testHeader.innerHTML = "Test " + i;
		topLevelContainer.appendChild(testHeader);
		var br = document.createElement("br");
		//topLevelContainer.appendChild(br);
		fc_display_test_passages(argContainerId, i) // pass in test number
	}
}

function fc_display_test_passages(argContainerId, argTestNum)
{
	var topLevelContainer = document.getElementById(argContainerId);
	var i = 1;
	var numPassages = 6;
	var keys = Object.keys(fc_passages);
	for(i = 1; i <= numPassages; i++)
	{
		var passageId = "T" + argTestNum + "S1P" + i;
		var header = document.createElement("h3");
		header.innerHTML = "Passage " + i;
		topLevelContainer.appendChild(header);
		var br = document.createElement("br");
		//topLevelContainer.appendChild(br);
		var article = document.createElement("article");
		topLevelContainer.appendChild(article);
		setAttributes(article, {"id": "test" + argTestNum + "_passage" + i,
			"class": "reading_passage"
				});
//		article.innerHTML = fc_passages[passageId].text;
		fc_display_numbered_lines(article, passageId);
		br = document.createElement("br");
		topLevelContainer.appendChild(br);
	}
}


function fc_display_passage(argContainer, argPassageId)
{
	//alert("fc_display_passage id" + argPassagId);
	//var header = document.createElement("h3");
	//header.innerHTML = "Passage " + argPassageNumber;
	//argContainer.appendChild(header);
	//var br = document.createElement("br");
	//argContainer.appendChild(br);
	//var article = document.createElement("article");
	//argContainer.appendChild(article);
	//setAttributes(article, {"id": "test1_passage" + argPassageNumber });
	
	var articleWidth = article.clientWidth;
	fc_display_numbered_lines(argContainer, argPassageNumber);
	//article.appendChild(linedPassage);
	//article.innerHTML = fc_passages[keys[argPassageNumber-1]].text;
	br = document.createElement("br");
	argContainer.appendChild(br);
	//return container;
}

function fc_display_numbered_lines(argContainer, argPassageId)
{
	alert("fc_display_numbered_lines: width = " + argContainer.clientWidth);
	var canvas = document.createElement('canvas');
	var context = canvas.getContext("2d");
	context.font = "12pt Roboto";
	var tableHeaderRow = document.createElement("DIV");
	setAttributes(tableHeaderRow, {
	    "id": 'readingHeader_'+ argPassageId,
	    "class": 'readingHeader_'+ argPassageId
	});
	tableHeaderRow.innerHTML = "blah blah blah";
	//argContainer.appendChild(tableHeaderRow);
	var passageTable = document.createElement("table");
	setAttributes(passageTable, {
	    "id": argPassageId } );
    	argContainer.appendChild(passageTable);
	//tableHanger.appendChild(passageTable);
	var tableBody = document.createElement("tbody");
	passageTable.appendChild(tableBody);
	var truePassageContent = fc_passages[argPassageId].text.replace(/[\—]/g, " — ");
	console.log(truePassageContent);
	var paragraphArray = truePassageContent.split(/\n/);
	console.log(paragraphArray);
	var numParagraphs = paragraphArray.length;
	var currentRow = 0;
	for(i=0; i< numParagraphs; i++)
	{
		var wordArray = paragraphArray[i].split(/\s/g);
		console.log(wordArray);
		var numWords = wordArray.length;
		var wordCount = 0;
		var currentWidth = 0;
		while(wordCount < numWords)
		{
			var currentLine = "";
			var testLine = "";
			var space="&nbsp&nbsp&nbsp&nbsp&nbsp";
//			var space = "   ";
			var spaceOffset = "";
			while((currentWidth + 60) < argContainer.clientWidth && wordCount <= numWords)
			{
				currentLine = testLine;
				if (testLine != "")
				{
					//alert("added a space");
					testLine += " "; //add a space if not beginning
					//spaceOffset = "";
      				}
      				else if(wordCount == 0)
      				{
      					//new paragraph
      					testLine += space;
      					spaceOffset = "aaaaaaaaaaaaaaaaaaaaa";
      				}
				testLine += wordArray[wordCount]; //add a word
				//alert("added a word. testLine = '" + testLine + "'");
				wordCount++;
				currentWidth = context.measureText(testLine).width - context.measureText(spaceOffset).width;
				//alert("currentWidth = " + currentWidth);
			}
			if(wordCount != numWords)
			{
				//ended while loop b/c of line width, so undo one word
				wordCount--;
			}
			//no line numbers on preface
			if(i > 0)
			{
				currentRow++; 
			}
			currentWidth = 0;
			var passageRow = document.createElement("TR");
			setAttributes(passageRow, {
				"id": argPassageId + "R" + currentRow,
				"class": 'passage1passageRow' + currentRow } );
			tableBody.appendChild(passageRow);
			var passageNumberColumn = document.createElement("TD");
			passageNumberColumn.innerHTML = currentRow;
			setAttributes(passageNumberColumn, {
				"id": argPassageId +'numb_col'+ currentRow,
				"class": "fc_line_no_col" } );
			passageRow.appendChild(passageNumberColumn);
			var textColumn = document.createElement("TD");
			if (currentRow % 5 !== 0 || currentRow == 0)
			{
				//var backgroundColor = window.getComputedStyle(passageNumberColumn).getPropertyValue("background-color");
				passageNumberColumn.style.color = "transparent";
				//setAttributes(passageNumberColumn, {"class": 'hidden' } );
			}
			if(currentRow == 0)
			{
				textColumn.style.fontStyle = "italic";
			}
			setAttributes(textColumn, {
				"id": argPassageId +'R' + currentRow + "text",
				"class": 'passage1textrow' + currentRow } );

			textColumn.innerHTML = currentLine;
			passageRow.appendChild(textColumn);
			//alert("added row " + currentRow + " with content '" + textColumn.innerHTML);
			if(currentRow == 250)
			{
				alert("whoa");
				break;
			}
		}	
	}

	return passageTable;
}


function fc_display_all_questions(argContainerId)
{
	//alert("pre qs");
	if(!fc_questions_loaded || !fc_answers_loaded)
	{
		return 0;
	}
	var numTests = 4;
	var topLevelContainer = document.getElementById(argContainerId);
	for(i = 0; i < numTests; i++)
	{
		var testId = i+1;
		var testTitle = document.createElement("h2");
		testTitle.innerHTML = "Test " + testId;
		topLevelContainer.appendChild(testTitle);
		var testQuestionsOL = document.createElement("ol");
		setAttributes(testQuestionsOL, {"id": "T" + testId + "S1", "type": "1" });
		topLevelContainer.appendChild(testQuestionsOL);
		fc_display_test_questions(testId, testQuestionsOL);
		var br = document.createElement("br");
		topLevelContainer.appendChild(br);
		var br = document.createElement("br");
		topLevelContainer.appendChild(br);
	}
}

function fc_display_test_questions(argTestId, argOLElem)
{
	var questionKeys = Object.keys(fc_questions);
	var numQuestions = questionKeys.length;
	//alert("displaying test " + argTestId + " with numQ = " + numQuestions);
	var i = 0;
	for(i=0; i < numQuestions; i++)
	{
		var questionObj = fc_questions[questionKeys[i]];
		//alert("found section id = " + questionObj.section);
		if(questionObj.testNum == argTestId)
		{
			//append an LI containingg question and two BRs to OL
			var questionLI = fc_display_question(questionKeys[i]);
			argOLElem.appendChild(questionLI);
			var br = document.createElement("br");
			argOLElem.appendChild(br);
			br = document.createElement("br");
			argOLElem.appendChild(br);
		}
	}
}

function fc_display_question(argQuestionId)
{
	var questionObj = fc_questions[argQuestionId];
	var questionLI = document.createElement("li");
	setAttributes(questionLI, {
			"id": argQuestionId + "_all"
	});
	var stemSPAN = document.createElement("span");
	setAttributes(stemSPAN, {
			"id": argQuestionId,
			"onclick": "fc_set_question_context('" + argQuestionId + "')"
	});
	stemSPAN.innerHTML = questionObj.text;	
	questionLI.appendChild(stemSPAN); 
	var choices = fc_display_answer_choices(argQuestionId);
	//append OL of answer choices returned by fc_display_answer_choices()
	questionLI.appendChild(choices);
	return questionLI;
}

function fc_display_answer_choices(argQuestionId)
{
	var letter = "A";
	var numChoices = 4;
	var i = 0;
	var answersOL = document.createElement("ol");
	setAttributes(answersOL, {"type": "A"});
	for(i = 0; i < numChoices; i++)
	{
		var answerChoiceId = argQuestionId + letter;
		var answerLI = fc_display_answer_choice(answerChoiceId);
		answersOL.appendChild(answerLI);
		letter = String.fromCharCode(letter.charCodeAt(0) + 1); // increment alpha character
	}
	return answersOL;
}

function fc_display_answer_choice(argAnswerChoiceId)
{
	//alert("display_answer_choice: id = " + argAnswerChoiceId);
	var answerChoiceObj = fc_answer_choices[argAnswerChoiceId];
	var answerLI = document.createElement("li");
	setAttributes(answerLI, {"id": argAnswerChoiceId,
				"onclick": "fc_set_answer_context('" + argAnswerChoiceId + "')"
				});
	answerLI.innerHTML = answerChoiceObj.text;
	return answerLI;
}

function fc_link_all_quotes()
{
	var wholeFirebase = new Firebase(fc_firebase_root);	
	var answers_location = wholeFirebase.child("answers");
	var questions_location = wholeFirebase.child("questions");
	var passages_location = wholeFirebase.child("passages");
	passages_location.once("value", function(snp) {
		fc_load_passages_from_firebase(snp);
		answers_location.once("value", function(snapshot) {
			//alert("got answers snapshot back from firebase");
			fc_load_subtree_from_firebase(snapshot, "answers");
			questions_location.once("value", function(snap) {
				//alert("got questions snap back from firebase");
				fc_load_subtree_from_firebase(snap, "questions");
				fc_link_passage_quotes();
			});
		});	
	});
}

function fc_strip_non_alpha(argStringArray)
{
	var numStrings = argStringArray.length;
	for(i = 0; i < numStrings; i++)
	{
		argStringArray[i] = argStringArray[i].replace(/\,/g, "");
		argStringArray[i] = argStringArray[i].replace(/\./g, "");
		argStringArray[i] = argStringArray[i].replace(/\!/g, "");
		argStringArray[i] = argStringArray[i].replace(/\?/g, "");	
		argStringArray[i] = argStringArray[i].replace(/\;/g, "");
		argStringArray[i] = argStringArray[i].replace(/\:/g, "");
		argStringArray[i] = argStringArray[i].replace(/\-/g, "");
		argStringArray[i] = argStringArray[i].replace(/\—/g, "");
		argStringArray[i] = argStringArray[i].replace(/\”/g, "");
		argStringArray[i] = argStringArray[i].replace(/\“/g, "")
	}
}

function fc_link_passage_quotes()
{
	//alert("fc_link_passage_quotes for passage " + argPassageId);
//	var passageElem = document.getElementById(argPassageId);
	//alert("fc_linkpassage passage = " + passageElem.innerHTML);
	
	var i = 0;
	var quote = "";

	for(question_key in fc_questions)
	{
		var questionId = question_key;
		var question = fc_questions[questionId];
		var passageId = question.passageId;
		var passage = fc_passages[passageId];
		//alert("trying to link question " + questionId + " for passage " + passageId);
		var qElem = document.getElementById(questionId);
		//var qText = qElem.innerHTML;
		var qText = question.text;
		//find line number quotes
		var quoteBrief = qText.match( /(\"|\“).+?(\"|\”)/g ); //" to keep the stupid editor color right
		var numQuotes = 0;
		if(quoteBrief != null)
		{
			numQuotes = quoteBrief.length;
			question.numQuotes = numQuotes;
		}
		var elliptical = false;
		//alert("numQuotes for question " + questionId + " is " + numQuotes);
		for(j=0; j < numQuotes; j++)
		{		
			//strip out quotation marks
			quoteBrief[j] = quoteBrief[j].replace("\"", "");
			quoteBrief[j] = quoteBrief[j].replace("\“", "");
			quoteBrief[j] = quoteBrief[j].replace("\”", "");
			//alert("quoteBrief[j] = " + quoteBrief[j]);
			if(quoteBrief[j].indexOf("...") != -1)
			{
				elliptical = true;
				//alert("found elliptical");
				//remove ellipses and match differently later

			}

//			if(lineNumMatches != null && lineNumMatches.length != 0)
			if(true) // want to look for quote even if no line number strings in question
			{
				//alert("quote in question " + question_key + " is '" + quoteBrief[0] + "' and line no string = " + lineNumStr[0]);
				var quoteWordArray = [];
				if(elliptical == true)
				{
					//search for unabbreviated quote
					var ellipticalArray = quoteBrief[j].split("... ");
					//ellipticalArray[0] = ellipticalArray[0].replace(" ", "");
					//ellipticalArray[1] = ellipticalArray[1].replace(" ", "");
					console.log(ellipticalArray);
					var regex = new RegExp(ellipticalArray[0] + ".+?" + ellipticalArray[1],"g");
					console.log(regex);
					console.log(passage.text);
					var ellipQuote = passage.text.match(regex);
					if(ellipQuote == null || ellipQuote.length == 0)
					{
						alert("failed to find elliptical quote");
					}
					else
					{
						//alert("found elliptical quote '" + ellipQuote + "'");
						quoteWordArray = ellipQuote[0].split(" ");
					}
				}
				else
				{
					quoteWordArray = quoteBrief[j].split(" ");
				}
				//now find the quoted material in the passage
				passage.text = passage.text.replace(" -- ", " ");
				var passageWordArray = passage.text.split(" ");
				fc_strip_non_alpha(passageWordArray);
				var numWordsInPassage = passageWordArray.length;

				fc_strip_non_alpha(quoteWordArray);
				var numWordsInQuote = quoteWordArray.length;
				var firstQuoteWord = quoteWordArray[0];
				var lastQuoteWord = quoteWordArray[numWordsInQuote - 1];
				var startPassageQuoteWordIndex = 0;
				var passageQuoteFound = false;
				var passageWordIndex = 0;
				while(passageQuoteFound != true && passageWordIndex < numWordsInPassage)
				{
					//obtain the first candidate quote location by finding first word
					startPassageQuoteWordIndex = passageWordArray.indexOf(firstQuoteWord, passageWordIndex);
					if(startPassageQuoteWordIndex == -1)
					{
						//alert("failed to find first word = " + firstQuoteWord + " after word index " + passageWordIndex);
						break;
					}
					else
					{
						if(question_key == "T1S1Q12")
						{
							console.log(passageWordArray);
							alert("found first word at " + startPassageQuoteWordIndex);
						}
					}
					passageQuoteFound = true; //set this to true temporarily unless mismatch occurs below
					for(i = 0; i < numWordsInQuote; i++)
					{
						if(quoteWordArray[i] != passageWordArray[startPassageQuoteWordIndex + i])
						{
							passageQuoteFound = false;
							//alert("failed to find word '" + quoteWordArray[i] + "' in passage");
							i = numWordsInQuote; // exit for loop
						}
					}
					if(passageQuoteFound == false)
					{
						passageWordIndex = startPassageQuoteWordIndex + 1; 
						// look further in the passage for another candidate
					}
				}
				if(passageQuoteFound == true)
				{
					//question.quoteBeginWordIndex[j] = startPassageQuoteWordIndex;
					question["quote" + j + "BeginWordIndex"] = startPassageQuoteWordIndex;
					//question.quoteEndWordIndex[j] = startPassageQuoteWordIndex + numWordsInQuote - 1;
					question["quote" + j + "EndWordIndex"] = startPassageQuoteWordIndex + numWordsInQuote - 1;
					question["quote" + j] = quoteBrief[j];
					//alert("found quote in question from word " + question['quote' + j + 'BeginWordIndex'] + " to " + question['quote' + j + 'EndWordIndex']);
					fc_persist_obj(questionId, question, "questions");
				}
				var pElem = document.getElementById(passageId);		
			}
			/*
			else
			{
				alert("found quote but no line number strings in question " + question_key);
			}
			*/
		}
		//found quotation, now find "line X" or "lines X-Y" string
/*
		var lineNumMatches = qText.match(/Line[s]? [1-9][0-9]?[0-9]?(-[1-9][0-9]?[0-9]?)?/gi);
		var startingLineNumCharIndices = [];
		if(lineNumMatches == null)
		{
			//search for "first paragraph" ?
			question.quoteBeginWordIndex = 1;
			question.quoteEndWordIndex = passage.text.split(" ").length;
			fc_persist_obj(questionId, question, "questions");
		}
		else
		{
			//found line num string or strings
			var numLineNumStrs = lineNumMatches.length;
			for(i=0; i < numLineNumStrs; i++)
			{
				startingLineNumCharIndices[i] = qText.indexOf(lineNumMatches[i]);
			}
		}
		*/
	}
}
/*
		//finds quote string in format used in answer choices
		var qNum = i+1;
		var elemId = "FC_Reading_S1Q" + qNum + "stem";
		//find line number quotes
		var startQuoteInQ = questions[i].indexOf("\(\"");
		var endQuoteInQ = questions[i].indexOf("\"\)");
		var quoteBrief = questions[i].slice(startQuoteInQ, endQuoteInQ);
		alert("quote in question = " + quoteBrief);
		var quoteChunks = quoteBrief.split("...");
		var searchQuote = quoteChunks[0] + ".*" + quoteChunks[1];
		var quoteMatches = passage1.text.match(searchQuote);
		alert("found " + quoteMatches.length + " matches for quote '" + quoteBrief + "'");
		//just use first match?

		fcElems[elemId].startQuote = passage1.indexOf(quoteMatches[0]);
		fcElems[elemId].endQuote = fcElems[elemId].startQuote + fcElems[elemId].quote.length;
		fcElems[elemId].quote = quoteMatches[0];
		alert("setting quote " + quoteMatches[0] + "' for question " + qNum);
	}
*/


function displayDataAssistant(displayAreaId)
{
	//alert("displayDataAssistant");
	var dispElem = document.getElementById(displayAreaId);
	
	var chx = Object.keys(dataAssistant.checkboxes);
	var i = 0;
	var numKeys = chx.length;
	for(i=0; i < numKeys; i++)
	{
		var inp = document.createElement("input");
		var checkValueJSString = "document.getElementById('" + chx[i] + "').checked";
		setAttributes(inp, {"id": chx[i], "name": chx[i], "type": "checkbox", "onchange":"fc_update_tag('" + chx[i] + "', " + checkValueJSString + ");"});
		var lab = document.createElement("label");
		setAttributes(lab, {"for": chx[i]});
		lab.innerHTML = chx[i];
		var br = document.createElement("br");
		dispElem.appendChild(inp);
		dispElem.appendChild(lab);
		dispElem.appendChild(br);
	}
}

function fc_find_question_patterns(argDisplayAreaId, argPatternLength)
{
	var patterns = [];
	var patternCounts = [];
	var patternOccurences = [];
	var i = 0;
	var keys = Object.keys(fc_questions);
	var numQ = keys.length;
	//alert("numQ = " + numQ);
	var stems = [];
	for(i = 1; i < numQ; i++)
	{
		//var searchString = "A\)";
		var stem = fc_questions[keys[i]].text;
		stem = stem.replace(/\(.*\)/, ""); // get rid of parentheses inside stems
		stem = stem.replace(/\?/, "");  //get rid of ?
		stem = stem.replace(",", ""); //get rid of commas
		stem = stem.replace(";", ""); //get rid of semi-colons
		stem = stem.replace(/\"/, ""); //get rid of quotation marks
		stem = stem.replace(/\“/, ""); //get rid of quotation marks
		stem = stem.replace(/\”/, ""); //get rid of quotation marks "
		stem = stem.toLowerCase();
		var words = stem.split(" ");
		var numWords = words.length;
		for(j = 0; j < (numWords - argPatternLength)+1; j++)
		{
			var m = 1;
			var patt = words[j];
			while(m < argPatternLength)
			{
				patt = patt + " " + words[j+m];
				m++;
			}
			//alert("testing pattern = " + patt);
			var pattFound = patterns.indexOf(patt);
			if(pattFound == -1)
			{
				patterns.push(patt);
				//alert("adding pattern '" + patt + "' to the list");
				var where = patterns.indexOf(patt);
				patternCounts[where] = 1;
				patternOccurences[where] = i + 1;
				//alert("just added an occurence of " + patt + ". Occurences = " + patternOccurences[where]);
			}
			else
			{
				//alert("incrementing the count for pattern '" + patt + "'");
				patternCounts[pattFound]++;
				var questionNum = i + 1;
				patternOccurences[pattFound] = patternOccurences[pattFound] + ", " + keys[i];
				//alert("just added an occurence of " + patt + ". Occurences = " + patternOccurences[pattFound]);
			}
		}
	}
	
	var dispElem = document.getElementById(argDisplayAreaId);
	dispElem.innerHTML = "Repeated patterns of length " + argPatternLength + ":<br><br>";
	for(i=0; i < patterns.length; i++)
	{
		//alert("found pattern '" + interestingPatterns[i] + "' " + interestingPatternCounts[i] + " times");
		if(patternCounts[i] > 1)
		{
			dispElem.innerHTML += "'" + patterns[i] + "' found " + patternCounts[i] + " times at: " + patternOccurences[i] + "<br><br>";
		}
	}
	dispElem.innerHTML += "<br>";
	
/*
	var j = 0;
	var numStems = stems.length;
	for(i=0; i < numStems; i++)
	{
		var words = stems[i].split(" ");
		//alert("words = " + words);
		var numWords = words.length;
		for(j=0; j < (numWords-pattLen)+1; j++)
		{
			var m = 1;
			var patt = words[j];
			while(m < pattLen)
			{
				patt = patt + " " + words[j+m];
				m++;
			}
			//alert("testing pattern = " + patt);
			var pattFound = patterns.indexOf(patt);
			if(pattFound == -1)
			{
				patterns.push(patt);
				//alert("adding pattern '" + patt + "' to the list");
				var where = patterns.indexOf(patt);
				patternCounts[where] = 1;
				patternOccurences[where] = i + 1;
				//alert("just added an occurence of " + patt + ". Occurences = " + patternOccurences[where]);
			}
			else
			{
				//alert("incrementing the count for pattern '" + patt + "'");
				patternCounts[pattFound]++;
				var questionNum = i + 1;
				patternOccurences[pattFound] = patternOccurences[pattFound] + ", " + questionNum;
				//alert("just added an occurence of " + patt + ". Occurences = " + patternOccurences[pattFound]);
			}
		}
	}
*/

}

//NOT currently using local web storage directly
/*
function fc_load_from_ls()
{
	var allElems = document.getElementsByTagName("*");
	var max = allElems.length;
	for (var i=0; i < max; i++)
	{
		var elem = allElems[i];
		var lsVal = localStorage.getItem(elem.id);
		if(lsVal != null && lsVal != "")
		{
			//alert("loading " + elem.id + " value= " + lsVal);
			fcElems[elem.id] = JSON.parse(lsVal);
			//elem.setAttribute("data-tags", lsVal); 
			//elem.setAttribute("data-tags", lsObj.tags);
		}
	}
}
*/

function fc_unhighlight()
{
	if(theQuestionContextId != "")
	{
		//unhighlight old selection
		fc_highlight(theQuestionContextId);
	}
	if(theAnswerContextId != "")
	{
		//unhighlight old selection
		fc_highlight(theAnswerContextId);
	}
}

function fc_set_question_context(c)
{
	fc_unhighlight();
	theQuestionContextId = c;
	theAnswerContextId = "";
	fc_highlight(theQuestionContextId);
	//fc_highlight_passage(c);
	fc_update_tag_display();
}

function fc_set_answer_context(c)
{
	fc_unhighlight();
	theAnswerContextId = c;
	theQuestionContextId = "";
	fc_highlight(theAnswerContextId);
	//fc_highlight_passage(c);
	fc_update_tag_display();
}

function fc_highlight(id) {
	if(id == "")
	{
		return;
	}
	var elem = document.getElementById(id);
	var idLength = id.length;
	var lastChar = id[idLength - 1];
	if(lastChar == 'A' || lastChar == 'B' || lastChar == 'C' || lastChar == 'D')
	{
		obj = fc_answer_choices[id];
	}
	else
	{
		obj = fc_questions[id];
	}
	for(i = 0; i < obj.numQuotes; i++)
	{
		var quoteLocStr = "quote" + i + "BeginWordIndex";
		var quoteEndStr = "quote" + i + "EndWordIndex";
		var quoteLoc = obj[quoteLocStr];
		var quoteEnd = obj[quoteEndStr];
		var passage = document.getElementById(obj.passageId);

		//search through passage display elements
		var tds = passage.getElementsByTagName("td");
		var wordCount = 0;
		for(j = 0; j < tds.length; j++)
		{
			if(tds[j].id.indexOf("numb_col") != -1)
			{
				//line number column. ignore
			}
			else
			{
				var text = tds[j].innerHTML;
				text = text.replace(" -- ", " ");
				var words = text.split(" ");
				var lineWords = words.length;
				alert("wordCount = " + wordCount + " and lineWords = " + lineWords + " and quoteLoc = " + quoteLoc + " and quoteEnd = " + quoteEnd);
				if(wordCount <= quoteLoc && (wordCount + lineWords) >= quoteLoc && wordCount <= quoteEnd)
				{
					
					//found a line involved in quote
					if(tds[j].style.color == "red")
					{
						tds[j].style.color = "black";
					}
					else
					{
						tds[j].style.color = "red";
					}
					tds[j].scrollIntoView();
				}
				wordCount += lineWords;
				if(wordCount > quoteEnd)
				{
					break;
				}
			}
		}
	}
	if (elem.style.color == "red")
	{
		elem.style.color = "black";
	} 
	else
	{
		elem.style.color = "red";
	}
}

function fc_update_tag_display()
{
	if(theQuestionContextId != "")
	{
		for(tag in fc_reading_question_tags)
		{
			var dispElem = document.getElementById(tag);
			var question = fc_questions[theQuestionContextId];
			dispElem.checked = question.tags ? question.tags[tag] : false;
		}
		for(tag in fc_reading_answer_tags)
		{
			var dispElem = document.getElementById(tag);
			dispElem.checked = false;
		}
		document.getElementById(fc_answer_tag_container_id).style.display = "none";
		document.getElementById(fc_question_tag_container_id).style.display = "inline";
	}
	if(theAnswerContextId != "")
	{
		for(tag in fc_reading_answer_tags)
		{
			var dispElem = document.getElementById(tag);
			var answer = fc_answer_choices[theAnswerContextId];
			dispElem.checked = answer.tags ? answer.tags[tag] : false;
		}
		for(tag in fc_reading_question_tags)
		{
			var dispElem = document.getElementById(tag);
			dispElem.checked = false;
		}
		document.getElementById(fc_answer_tag_container_id).style.display = "inline";
		document.getElementById(fc_question_tag_container_id).style.display = "none";
	}
}


function fc_highlight_passage(elemId)
{
	var oldPassageContext = thePassageContextId;
	if(oldPassageContext != "")
	{
		//unhighlight old passage portion
		//alert("unhighlighting elem = " + oldPassageContext);
		var oldP = document.getElementById(oldPassageContext);
		if(oldP != null)
		{
			oldP.setAttribute("style", "color:black");
		}
	}
	thePassageContextId = elemId + "_psg";
	var passageQuoteSpan = document.getElementById(thePassageContextId);
	//alert("fc_highlight_passage: oldCID = " + oldPassageContext + " and currCID = " + thePassageContextId);
	if(passageQuoteSpan != null)
	{
		passageQuoteSpan.setAttribute("style", "color:red");
		passageQuoteSpan.scrollIntoView();
	}
}

function fc_highlight_passage_old(elemId)
{

	//alert("fc_highlight_passage: elemId = " + elemId);
	var passageElem = document.getElementById("passage1_test1");
	passage1.text = passageElem.innerHTML;
	var qNumStr = elemId.match(/Q.+stem/);

	qNumStr[0] = qNumStr[0].replace("Q", "");
	qNumStr[0] = qNumStr[0].replace("stem", "");

	var qNum = Number(qNumStr[0]);

	
	var questions = fc_theContent2[0].split(/[1-9][0-9]*\./g);

	var quoteBrief = questions[qNum].match( /(\"|\“).+(\"|\”)/ ); //" to keep the stupid editor color right
	console.log(quoteBrief);
	if(quoteBrief != null && quoteBrief.length != 0)
	{
		quoteBrief[0] = quoteBrief[0].replace("\"", "");
		quoteBrief[0] = quoteBrief[0].replace("\“", "");
		quoteBrief[0] = quoteBrief[0].replace("\”", "");
		var startQuoteInQ = questions[qNum].indexOf(quoteBrief[0]);
		var endQuoteInQ = startQuoteInQ + quoteBrief[0].length;
		//alert("quote in question = " + quoteBrief[0]);
		var quoteMatches = passage1.text.match(quoteBrief[0]);
		//alert("found " + quoteMatches.length + " matches for quote '" + quoteBrief[0] + "'");
		//just use first match?
		fcElems[elemId][elemId].quote = quoteMatches[0];
		fcElems[elemId][elemId].startQuote = passage1.text.indexOf(quoteMatches[0]);
		fcElems[elemId][elemId].endQuote = fcElems[elemId][elemId].startQuote + fcElems[elemId][elemId].quote.length;
		console.log(fcElems[elemId][elemId]);
		fc_persist_qp(fcElems[elemId], "questions");
		//alert("setting quote '" + quoteMatches[0] + "' for question " + qNum);
		//actual highlighting of passage
		passageElem.innerHTML = passageElem.innerHTML.replace(quoteMatches[0], "<span id='" + elemId + "_psg" + "'>" + quoteMatches[0] + "</span>");
		var pElem = document.getElementById(elemId + "_psg");
		theOldPassageContextId = thePassageContextId;
		if(theOldPassageContextId != "")
		{
			//unhighlight old passage portion
			alert("unhighlighting elem = " + theOldPassageContextId);
			var oldP = document.getElementById(theOldPassageContextId);
			oldP.setAttribute("style", "color:black");
		}

		thePassageContextId = elemId + "_psg";
		alert("fc_highlight_passage: oldCID = " + theOldPassageContextId + " and currCID = " + thePassageContextId);
		pElem.setAttribute("style", "color:red");
		pElem.scrollIntoView();
	}
}

function fc_update_tag(tag, tagValue)
{
	var subTree = "";
	var obj = {};
	var ctx = "";
	if(theQuestionContextId != "")
	{
		subTree = "questions";
		ctx = theQuestionContextId;
		obj = fc_questions[theQuestionContextId];
	}
	else if (theAnswerContextId != "")
	{
		subTree = "answers";
		ctx = theAnswerContextId;
		obj = fc_answer_choices[theAnswerContextId];
	}
	if(tagValue == true)
	{
		if(obj.tags == null)
		{
			obj.tags = {};
		}
		obj.tags[tag] = tagValue;
		console.log(obj);
		//alert("set obj.tags[tag] to " + obj.tags[tag]);
	}
	else
	{
		delete obj.tags[tag];
	}
	fc_persist_obj(ctx, obj, subTree);
}


//save a question part by whatever means (firebase, sql, local web storage)
function fc_persist_group(obj, subTree)
{
	var wholeFirebase = new Firebase(fc_firebase_root);
	var fb_subtree_location = wholeFirebase.child(subTree);
	console.log("about to persist group");
	console.log(obj);
	fb_subtree_location.update(obj);
}

function fc_persist_obj(objName, obj, subTree)
{
	var wholeFirebase = new Firebase(fc_firebase_root);
	var fb_subtree_location = wholeFirebase.child(subTree);
	console.log("about to persist obj");
	console.log(obj);
	//obj_loc.update(obj[keys[0]]);
	fb_subtree_location.child(objName).update(obj);
}

function fcGenerateTest(testId)
{
	//call fcGenerateSection which will call fcGenerateQuestions
}



function setAttributes(el, attrs) {
		for (var key in attrs) {
				el.setAttribute(key, attrs[key]);
		}
}

// **********************************************************************************************************************


function authDataCallback(authData) {
	
	if (authData) {
		setUserInfo(authData.uid);
	} else {
		window.location.assign("login.html");
	}
}
function setUserInfo(user_uid){
	var users_location = new Firebase(fc_firebase_root + "/users/" + user_uid);
	users_location.once("value", function(snapshot) {
		user_info = snapshot.val();
		document.getElementById('uid_shower').innerHTML = user_info.firstname + " " + user_info.lastname;
    	});
}
function logoutFromFirebase(){
	var wholeFirebase = new Firebase(fc_firebase_root);
	wholeFirebase.unauth();
}
function setSelectedTestName(test_selection){
	test_name = test_selection;
	changePassageOptionsIfNeeded();
}
function setSelectedSectionName(section_selection){
	section_name = section_selection;
	changePassageOptionsIfNeeded();
	switch(section_name){
		case "S1":
		case "S2":
			showSidebarElement("passageChoosingRow");
			break;
		default:
			hideSidebarElement("passageChoosingRow");
			break;
	}
}
function setSelectedPassageName(passage_selection){
	passage_name = passage_selection;
}
function changePassageOptionsIfNeeded(){
	if(test_name != "" && section_name != ""){
		var passage_root = test_name + section_name;
		setPassageSelectorOptions(passage_root);
	}
}
function setPassageSelectorOptions(passage_root){
	var passage_selector = document.getElementById("passageSelector");
	passage_selector.innerHTML = "";

	for(passage in passages){
	
		if(passage.indexOf(passage_root) > -1){
		
			var opt = document.createElement("option");
			option_id = passage + "option";
			setAttributes(opt, {"id": option_id, "value": passage});
			opt.text = passages[passage].name || "Double: " + passages[passage].name1 + " & " + passages[passage].name2;
			passage_selector.add(opt);
		}
	}
}



function initializeListOfTags(argTagType, argSnap)
{
	//alert("initTags: snap = " + argSnap);
	var list_of_tags = {};
	for(var i in argSnap)
	{
		list_of_tags[i] = argSnap[i];
		//alert("tag = " + i + " and list_of_tags[i] = " + list_of_tags[i]);
	}
	if(argTagType == "question")
	{
		fc_reading_question_tags = list_of_tags;
	}
	else if(argTagType == "answer")
	{
		fc_reading_answer_tags = list_of_tags;
	}
}

function fc_display_tags(argTagType, argContainerId)
{
	var tag_list = argTagType == "question" ? fc_reading_question_tags : fc_reading_answer_tags;
	console.log(tag_list);
	//alert("fc_display_tags");
	var dispElem = document.getElementById(argContainerId);
	for(tag in tag_list)
	{
		var inp = document.createElement("input");
		var checkValueJSString = "document.getElementById('" + tag + "').checked";
		setAttributes(inp, {"id": tag, "name": tag, "type": "checkbox", "onchange":"fc_update_tag('" + tag + "', " + checkValueJSString + ");"});
		var lab = document.createElement("label");
		setAttributes(lab, {"for": tag});
		lab.innerHTML = tag;
		var br = document.createElement("br");
		dispElem.appendChild(inp);
		dispElem.appendChild(lab);
		dispElem.appendChild(br);
	}
}


/*
function initializeListOfTags(displayAreaId, tagSnap){
	var list_of_tags = {};
	for(var i in tagSnap){
		if(tagSnap[i].subtypes){
			for(var j in tagSnap[i].subtypes){
				list_of_tags[tagSnap[i].type + "-" + tagSnap[i].subtypes[j].subtype] = false;
			}
		}else{
			list_of_tags[tagSnap[i].type] = false;
		}
	}
	switch(displayAreaId) {
    		case 'questionTaggingArea':
    			fc_reading_question_tags = list_of_tags;
        		break;
    		case 'answerTaggingArea':
        		fc_reading_answer_tags = list_of_tags;
        		break;
	}
	initializeTagCheckboxes(displayAreaId,list_of_tags);
}
*/

function initializeTagCheckboxes(displayAreaId,tags){
	var dispElem = document.getElementById(displayAreaId);
	dispElem.innerHTML = "";
	var chx = Object.keys(tags);
	var numKeys = chx.length;

	for(i=0;i<numKeys;i++){
		var inp = document.createElement("input");
		setAttributes(inp, {"id": chx[i], "name": chx[i], "type": "checkbox"});
		var lab = document.createElement("label");
		setAttributes(lab, {"for": chx[i]});
		lab.innerHTML = chx[i];
		var br = document.createElement("br");
		dispElem.appendChild(inp);
		dispElem.appendChild(lab);
		dispElem.appendChild(br);
	}
}


/*
	All functions below are for on child_added or on child_removed function instead of on value [this is nice-jason]
*/

function addNewTagToList(displayAreaId, tagSnap){
	switch(displayAreaId) {
    		case "questionTaggingArea":
    			reading_question_tags[tagSnap.type] = false;
    			//alert(JSON.stringify(reading_question_tags));
        		break;
    		case "answerTaggingArea":
        		reading_answer_tags = list_of_tags;
        		break;
	}
}

//	Put new checkbox in appropriate place alphabetically
function insertCheckboxInPlace(displayAreaId){
	var dispElem = document.getElementById(displayAreaId);
	var child_elements = dispElem.childNodes;
	var inp = document.createElement("input");
	setAttributes(inp, {"id": "IS IT HERE", "name": "IS IT HERE", "type": "checkbox"});
	var lab = document.createElement("label");
	setAttributes(lab, {"for": "IS IT HERE"});
	lab.innerHTML = "IS IT HERE";
	var br = document.createElement("br");
	
	/*var strg = "";
	for(var i=0; i < child_elements.length; i++){
		strg = strg + child_elements[i].id + "\n";
	}
	alert (strg);*/
	
	
	//	Just seeing how insertAdjacent worked
	child_elements[6].insertAdjacentHTML('beforebegin',br.outerHTML);
	child_elements[6].insertAdjacentHTML('beforebegin',lab.outerHTML);	
	child_elements[6].insertAdjacentHTML('beforebegin',inp.outerHTML);
}



//just a function I was using to check if we were pulling anything from Firebase	 [good]
function alertFirebaseTree(treePart){

	var wholeFirebase = new Firebase(fc_firebase_root);

	treePart = treePart || wholeFirebase;
	treePart.on("value", function(snapshot,prevChildKey){
		alert(JSON.stringify(snapshot.val(),null,2));
	}, function(errorObject){
		alert("The read failed: " + errorObject.code);
	});
}


// HTML Element Utility Functions
function showSidebarElement(element_id){
	var the_element = document.getElementById(element_id);
	if(the_element.style.display == "" || the_element.style.display == "none"){
		if(the_element.tagName == "TR"){
			the_element.style.display = "table-row";
		} else {
			the_element.style.display = "block";
		}
	}
}
function hideSidebarElement(element_id){
	var the_element = document.getElementById(element_id);
	if(the_element.style.display == "table-row" || the_element.style.display == "block"){
		the_element.style.display = "none";
	}
}


fc_raw_passages["T1S1P1"] = new FC_Passage("This passage is from Lydia Minatoya, The Strangeness of Beauty. ©1999 by Lydia Minatoya. The setting is Japan in 1920. Chie and her daughter Naomi are members of the House of Fuji, a noble family.\n Akira came directly, breaking all tradition. Was that it? Had he followed form—had he asked his mother to speak to his father to approach a go-between—would Chie have been more receptive?\n He came on a winter’s eve. He pounded on the door while a cold rain beat on the shuttered veranda, so at first Chie thought him only the wind. The maid knew better. Chie heard her soft scuttling footsteps, the creak of the door. Then the maid brought a calling card to the drawing room, for Chie.\n Chie was reluctant to go to her guest; perhaps she was feeling too cozy. She and Naomi were reading at a low table set atop a charcoal brazier. A thick quilt spread over the sides of the table so their legs were tucked inside with the heat. “Who is it at this hour, in this weather?” Chie questioned as she picked the name card off the maid’s lacquer tray. “Shinoda, Akira. Kobe Dental College,” she read. Naomi recognized the name. Chie heard a soft intake of air. “I think you should go,” said Naomi. Akira was waiting in the entry. He was in his early twenties, slim and serious, wearing the black military-style uniform of a student. As he bowed—his hands hanging straight down, a black cap in one, a yellow oil-paper umbrella in the other—Chie glanced beyond him. In the glistening surface of the courtyard’s rain-drenched paving stones, she saw his reflection like a dark double. “Madame,” said Akira, “forgive my disruption, but I come with a matter of urgency.” His voice was soft, refined. He straightened and stole a deferential peek at her face. In the dim light his eyes shone with sincerity. Chie felt herself starting to like him. “Come inside, get out of this nasty night. Surely your business can wait for a moment or two.” “I don’t want to trouble you. Normally I would approach you more properly but I’ve received word of a position. I’ve an opportunity to go to America, as dentist for Seattle’s Japanese community.” “Congratulations,” Chie said with amusement. “That is an opportunity, I’m sure. But how am I involved?” Even noting Naomi’s breathless reaction to the name card, Chie had no idea. Akira’s message, delivered like a formal speech, filled her with maternal amusement. You know how children speak so earnestly, so hurriedly, so endearingly about things that have no importance in an adult’s mind? That’s how she viewed him, as a child. It was how she viewed Naomi. Even though Naomi was eighteen and training endlessly in the arts needed to make a good marriage, Chie had made no effort to find her a husband. Akira blushed. “Depending on your response, I may stay in Japan. I’ve come to ask for Naomi’s hand.” Suddenly Chie felt the dampness of the night. “Does Naomi know anything of your . . . ambitions?” “We have an understanding. Please don’t judge my candidacy by the unseemliness of this proposal. I ask directly because the use of a go-between takes much time. Either method comes down to the same thing: a matter of parental approval. If you give your consent, I become Naomi’s yoshi.* We’ll live in the House of Fuji. Without your consent, I must go to America, to secure a new home for my bride.” Eager to make his point, he’d been looking her full in the face. Abruptly, his voice turned gentle. “I see I’ve startled you. My humble apologies. I’ll take no more of your evening. My address is on my card. If you don’t wish to contact me, I’ll reapproach you in two weeks’ time. Until then, good night.” He bowed and left. Taking her ease, with effortless grace, like a cat making off with a fish. “Mother?” Chie heard Naomi’s low voice and turned from the door. “He has asked you?” The sight of Naomi’s clear eyes, her dark brows gave Chie strength. Maybe his hopes were preposterous. “Where did you meet such a fellow? Imagine! He thinks he can marry the Fuji heir and take her to America all in the snap of his fingers!” Chie waited for Naomi’s ripe laughter. Naomi was silent. She stood a full half minute looking straight into Chie’s eyes. Finally, she spoke. “I met him at my literary meeting.” Naomi turned to go back into the house, then stopped. “Mother.” “Yes?” “I mean to have him.\n Footnote: *a man who marries a woman of higher status and takes her family’s name", 1, false, 10);

fc_raw_passages["T1S1P2"] = new FC_Passage("This passage is adapted from Francis J. Flynn and Gabrielle S. Adams, “Money Can't Buy Love: Asymmetric Beliefs about Gift Price and Feelings of Appreciation.” ©2008 by Elsevier Inc.\n Every day, millions of shoppers hit the stores in full force—both online and on foot—searching frantically for the perfect gift. Last year, Americans spent over $30 billion at retail stores in the month of 5 December alone. Aside from purchasing holiday  gifts, most people regularly buy presents for other occasions throughout the year, including weddings, birthdays, anniversaries, graduations, and baby showers. This frequent experience of gift-giving can engender ambivalent feelings in gift-givers. Many relish the opportunity to buy presents because gift-giving offers a powerful means to build stronger bonds with one’s closest peers. At the same time, many dread the thought of buying gifts; they worry that their purchases will disappoint rather than delight the intended recipients. Anthropologists describe gift-giving as a positive social process, serving various political, religious, and psychological functions. Economists, however, offer a less favorable view. According to Waldfogel (1993), gift-giving represents an objective waste of resources. People buy gifts that recipients would not choose to buy on their own, or at least not spend as much money to purchase (a phenomenon referred to as ‘‘the deadweight loss of Christmas”). To wit, givers are likely to spend $100 to purchase a gift that receivers would spend only $80 to buy themselves. This ‘‘deadweight loss” suggests that gift-givers are not very good at predicting what gifts others will appreciate. That in itself is not surprising to social psychologists. Research has found that people often struggle to take account of others’ perspectives— their insights are subject to egocentrism, social projection, and multiple attribution errors. What is surprising is that gift-givers have considerable experience acting as both gift-givers and gift-recipients, but nevertheless tend to overspend each time they set out to purchase a meaningful gift. In the present research, we propose a unique psychological explanation for this overspending problem—i.e., that gift-givers equate how much they spend with how much recipients will appreciate the gift (the more expensive the gift, the stronger a gift-recipient’s feelings of appreciation). Although a link between gift price and feelings of appreciation might seem intuitive to gift-givers, such an assumption may be unfounded. Indeed, we propose that gift-recipients will be less inclined to base their feelings of appreciation on the magnitude of a gift than givers assume. Why do gift-givers assume that gift price is closely linked to gift-recipients’ feelings of appreciation? Perhaps givers believe that bigger (i.e., more expensive) gifts convey stronger signals of thoughtfulness and consideration. According to Camerer (1988) and others, gift-giving represents a symbolic ritual, whereby gift-givers attempt to signal their positive attitudes toward the intended recipient and their willingness to invest resources in a future relationship. In this sense, gift-givers may be motivated to spend more money on a gift in order to send a “stronger signal” to their intended recipient. As for gift-recipients, they may not construe smaller and larger gifts as representing smaller and larger signals of thoughtfulness and consideration. The notion of gift-givers and gift-recipients being unable to account for the other party’s perspective seems puzzling because people slip in and out of these roles every day, and, in some cases, multiple times in the course of the same day. Yet, despite the extensive experience that people have as both givers and receivers, they often struggle to transfer information gained from one role (e.g., as a giver) and apply it in another, complementary role (e.g., as a receiver). In theoretical terms, people fail to utilize information about their own preferences and experiences in order to produce more efficient outcomes in their exchange relations. In practical terms, people spend hundreds of dollars each year on gifts, but somehow never learn to calibrate their gift expenditures according to personal insight.", 1, false, 11);

fc_raw_passages["T1S1P3"] = new FC_Passage("This passage is adapted from J. D. Watson and F. H. C. Crick, “Genetical Implications of the Structure of Deoxyribonucleic Acid.” ©1953 by Nature Publishing Group. Watson and Crick deduced the structure of DNA using evidence from Rosalind Franklin and R. G. Gosling’s X-ray crystallography diagrams of DNA and from Erwin Chargaff’s data on the base composition of DNA. \n The chemical formula of deoxyribonucleic acid (DNA) is now well established. The molecule is a very long chain, the backbone of which consists of a regular alternation of sugar and phosphate groups. To each sugar is attached a nitrogenous base, which can be of four different types. Two of the possible bases—adenine and guanine—are purines, and the other two—thymine and cytosine—are pyrimidines. So far as is known, the sequence of bases along the chain is irregular. The monomer unit, consisting of phosphate, sugar and base, is known as a nucleotide. The first feature of our structure which is of biological interest is that it consists not of one chain, but of two. These two chains are both coiled around a common fiber axis. It has often been assumed that since there was only one chain in the chemical formula there would only be one in the structural unit. However, the density, taken with the X-ray evidence, suggests very strongly that there are two. The other biologically important feature is the manner in which the two chains are held together. This is done by hydrogen bonds between the bases. The bases are joined together in pairs, a single base from one chain being hydrogen-bonded to a single base from the other. The important point is that only certain pairs of bases will fit into the structure. One member of a pair must be a purine and the other a pyrimidine in order to bridge between the two chains. If a pair consisted of two purines, for example, there would not be room for it. We believe that the bases will be present almost entirely in their most probable forms. If this is true, the conditions for forming hydrogen bonds are more restrictive, and the only pairs of bases possible are: adenine with thymine, and guanine with cytosine. Adenine, for example, can occur on either chain; but when it does, its partner on the other chain must always be thymine. The phosphate-sugar backbone of our model is completely regular, but any sequence of the pairs of bases can fit into the structure. It follows that in a long molecule many different permutations are possible, and it therefore seems likely that the precise sequence of bases is the code which carries the genetical information. If the actual order of the bases on one of the pair of chains were given, one could write down the exact order of the bases on the other one, because of the specific pairing. Thus one chain is, as it were, the complement of the other, and it is this feature which suggests how the deoxyribonucleic acid molecule might duplicate itself.", 1, false, 10);

fc_raw_passages["T1S1P4"] = new FC_Passage("This passage is adapted from Virginia Woolf, Three Guineas. ©1938 by Harcourt, Inc. Here, Woolf considers the situation of women in English society. \n Close at hand is a bridge over the River Thames, an admirable vantage ground for us to make a survey. The river flows beneath; barges pass, laden with timber, bursting with corn; there on one side are the domes and spires of the city; on the other, Westminster and the Houses of Parliament. It is a place to stand on by the hour, dreaming. But not now. Now we are pressed for time. Now we are here to consider facts; now we must fix our eyes upon the procession—the procession of the sons of educated men. There they go, our brothers who have been educated at public schools and universities, mounting those steps, passing in and out of those doors, ascending those pulpits, preaching, teaching, administering justice, practising medicine, transacting business, making money. It is a solemn sight always—a procession, like a caravanserai crossing a desert. . . . But now, for the past twenty years or so, it is no longer a sight merely, a photograph, or fresco scrawled upon the walls of time, at which we can look with merely an esthetic appreciation. For there, trapesing along at the tail end of the procession, we go ourselves. And that makes a difference. We who have looked so long at the pageant in books, or from a curtained window watched educated men leaving the house at about nine-thirty to go to an office, returning to the house at about six-thirty from an office, need look passively no longer. We too can leave the house, can mount those steps, pass in and out of those doors,... make money, administer justice. . . . We who now agitate these humble pens may in another century or two speak from a pulpit. Nobody will dare contradict us then; we shall be the mouthpieces of the divine spirit—a solemn thought, is it not? Who can say whether, as time goes on, we may not dress in military uniform, with gold lace on our breasts, swords at our sides, and something like the old family coal-scuttle on our heads, save that that venerable object was never decorated with plumes of white horsehair. You laugh—indeed the shadow of the private house still makes those dresses look a little queer. We have worn private clothes so long. . . . But we have not come here to laugh, or to talk of fashions—men’s and women’s. We are here, on the bridge, to ask ourselves certain questions. And they are very important questions; and we have very little time in which to answer them. The questions that we have to ask and to answer about that procession during this moment of transition are so important that they may well change the lives of all men and women for ever. For we have to ask ourselves, here and now, do we wish to join that procession, or don’t we? On what terms shall we join that procession? Above all, where is it leading us, the procession of educated men? The moment is short; it may last five years; ten years, or perhaps only a matter of a few months longer.... But, you will object, you have no time to think; you have your battles to fight, your rent to pay, your bazaars to organize. That excuse shall not serve you, Madam. As you know from your own experience, and there are facts that prove it, the daughters of educated men have always done their thinking from hand to mouth; not under green lamps at study tables in the cloisters of secluded colleges. They have thought while they stirred the pot, while they rocked the cradle. It was thus that they won us the right to our brand-new sixpence. It falls to us now to go on thinking; how are we to spend that sixpence? Think we must. Let us think in offices; in omnibuses; while we are standing in the crowd watching Coronations and Lord Mayor’s Shows; let us think . . . in the gallery of the House of Commons; in the Law Courts; let us think at baptisms and marriages and funerals. Let us never cease from thinking—what is this “civilization” in which we find ourselves? What are these ceremonies and why should we take part in them? What are these professions and why should we make money out of them? Where in short is it leading us, the procession of the sons of educated men?", 1, false, 10);

fc_raw_passages["T1S1P5"] = new FC_Passage("Passage 1 is adapted from Michael Slezak, “Space Mining: the Next Gold Rush?” ©2013 by New Scientist. Passage 2 is from the editors of New Scientist, “Taming the Final Frontier.” ©2013 by New Scientist. \n Follow the money and you will end up in space. That’s the message from a first-of-its-kind forum on mining beyond Earth. Convened in Sydney by the Australian Centre for Space Engineering Research, the event brought together mining companies, robotics experts, lunar scientists, and government agencies that are all working to make space mining a reality. The forum comes hot on the heels of the 2012 unveiling of two private asteroid-mining firms. Planetary Resources of Washington says it will launch its first prospecting telescopes in two years, while Deep Space Industries of Virginia hopes to be harvesting metals from asteroids by 2020. Another commercial venture that sprung up in 2012, Golden Spike of Colorado, will be offering trips to the moon, including to potential lunar miners. Within a few decades, these firms may be meeting earthly demands for precious metals, such as platinum and gold, and the rare earth elements vital for personal electronics, such as yttrium and lanthanum. But like the gold rush pioneers who transformed the western United States, the first space miners won’t just enrich themselves. They also hope to build an off-planet economy free of any bonds with Earth, in which the materials extracted and processed from the moon and asteroids are delivered for space-based projects. In this scenario, water mined from other worlds could become the most desired commodity. “In the desert, what’s worth more: a kilogram of gold or a kilogram of water?” asks Kris Zacny of HoneyBee Robotics in New York. “Gold is useless. Water will let you live.” Water ice from the moon’s poles could be sent to astronauts on the International Space Station for drinking or as a radiation shield. Splitting water into oxygen and hydrogen makes spacecraft fuel, so ice-rich asteroids could become interplanetary refuelling stations. Companies are eyeing the iron, silicon, and aluminium in lunar soil and asteroids, which could be used in 3D printers to make spare parts or machinery. Others want to turn space dirt into concrete for landing pads, shelters, and roads.", 1, true, 5);

fc_raw_passages["T1S1P6"] = new FC_Passage("\nThe motivation for deep-space travel is shifting from discovery to economics. The past year has seen a flurry of proposals aimed at bringing celestial riches down to Earth. No doubt this will make a few billionaires even wealthier, but we all stand to gain: the mineral bounty and spin-off technologies could enrich us all. But before the miners start firing up their rockets, we should pause for thought. At first glance, space mining seems to sidestep most environmental concerns: there is (probably!) no life on asteroids, and thus no habitats to trash. But its consequences —both here on Earth and in space—merit careful consideration. Part of this is about principles. Some will argue that space’s “magnificent desolation” is not ours to despoil, just as they argue that our own planet’s poles should remain pristine. Others will suggest that glutting ourselves on space’s riches is not an acceptable alternative to developing more sustainable ways of earthly life. History suggests that those will be hard lines to hold, and it may be difficult to persuade the public that such barren environments are worth preserving. After all, they exist in vast abundance, and even fewer people will experience them than have walked through Antarctica’s icy landscapes. There’s also the emerging off-world economy to consider. The resources that are valuable in orbit and beyond may be very different to those we prize on Earth. Questions of their stewardship have barely been broached—and the relevant legal and regulatory framework is fragmentary, to put it mildly. Space miners, like their earthly counterparts, are often reluctant to engage with such questions. One speaker at last week’s space-mining forum in Sydney, Australia, concluded with a plea that regulation should be avoided. But miners have much to gain from a broad agreement on the for-profit exploitation of space. Without consensus, claims will be disputed, investments risky, and the gains made insecure. It is in all of our long-term interests to seek one out.", 1, true, 6);

fc_raw_passages["T2S1P1"] = new FC_Passage("This passage is from Charlotte Brontë, The Professor, originally published in 1857. \n No man likes to acknowledge that he has made a mistake in the choice of his profession, and every man, worthy of the name, will row long against wind and tide before he allows himself to cry out, “I am baffled!” and submits to be floated passively back to land. From the first week of my residence in X— felt my occupation irksome. The thing itself—the work of copying and translating business-letters— was a dry and tedious task enough, but had that been all, I should long have borne with the nuisance; I am not of an impatient nature, and influenced by the double desire of getting my living and justifying to myself and others the resolution I had taken to become a tradesman, I should have endured in silence the rust and cramp of my best faculties; I should not have whispered, even inwardly, that I longed for liberty; I should have pent in every sigh by which my heart might have ventured to intimate its distress under the closeness, smoke, monotony, and joyless tumult of Bigben Close, and its panting desire for freer and fresher scenes; I should have set up the image of Duty, the fetish of Perseverance, in my small bedroom at Mrs. King’s lodgings, and they two should have been my household gods, from which my darling, my cherished-in-secret, Imagination, the tender and the mighty, should never, either by softness or strength, have severed me. But this was not all; the antipathy which had sprung up between myself and my employer striking deeper root and spreading denser shade daily, excluded me from every glimpse of the sunshine of life; and I began to feel like a plant growing in humid darkness out of the slimy walls of a well. Antipathy is the only word which can express the feeling Edward Crimsworth had for me—a feeling, in a great measure, involuntary, and which was liable to be excited by every, the most trifling movement, look, or word of mine. My southern accent annoyed him; the degree of education evinced in my language irritated him; my punctuality, industry, and accuracy, fixed his dislike, and gave it the high flavour and poignant relish of envy; he feared that I too should one day make a successful tradesman. Had I been in anything inferior to him, he would not have hated me so thoroughly, but I knew all that he knew, and, what was worse, he suspected that I kept the padlock of silence on mental wealth in which he was no sharer. If he could have once placed me in a ridiculous or mortifying position, he would have forgiven me much, but I was guarded by three faculties—Caution, Tact, Observation; and prowling and prying as was Edward’s malignity, it could never baffle the lynx-eyes of these, my natural sentinels. Day by day did his malice watch my tact, hoping it would sleep, and prepared to steal snake-like on its slumber; but tact, if it be genuine, never sleeps. I had received my first quarter’s wages, and was returning to my lodgings, possessed heart and soul with the pleasant feeling that the master who had paid me grudged every penny of that hard‑earned pittance—(I had long ceased to regard Mr. Crimsworth as my brother—he was a hard, grinding master; he wished to be an inexorable tyrant: that was all). Thoughts, not varied but strong, occupied my mind; two voices spoke within me; again and again they uttered the same monotonous phrases. One said: “William, your life is intolerable.” The other: “What can you do to alter it?” I walked fast, for it was a cold, frosty night in January; as I approached my lodgings, I turned from a general view of my affairs to the particular speculation as to whether my fire would be out; looking towards the window of my sitting-room, I saw no cheering red gleam.", 2, false, 10);

fc_raw_passages["T2S1P2"] = new FC_Passage("This passage is adapted from Iain King, “Can Economics Be Ethical?” ©2013 by Prospect Publishing. \n Recent debates about the economy have rediscovered the question, “is that right?”, where “right” means more than just profits or efficiency. Some argue that because the free markets allow for personal choice, they are already ethical. Others have accepted the ethical critique and embraced corporate social responsibility. But before we can label any market outcome as “immoral,” or sneer at economists who try to put a price on being ethical, we need to be clear on what we are talking about. There are different views on where ethics should apply when someone makes an economic decision. Consider Adam Smith, widely regarded as the founder of modern economics. He was a moral philosopher who believed sympathy for others was the basis for ethics (we would call it empathy nowadays). But one of his key insights in The Wealth of Nations was that acting on this empathy could be counter-productive—he observed people becoming better off when they put their own empathy aside, and interacted in a self-interested way. Smith justifies selfish behavior by the outcome. Whenever planners use cost-benefit analysis to justify a new railway line, or someone retrains to boost his or her earning power, or a shopper buys one to get one free, they are using the same approach: empathizing with someone, and seeking an outcome that makes that person as well off as possible—although the person they are empathizing with may be themselves in the future. Instead of judging consequences, Aristotle said ethics was about having the right character—displaying virtues like courage and honesty. It is a view put into practice whenever business leaders are chosen for their good character. But it is a hard philosophy to teach—just how much loyalty should you show to a manufacturer that keeps losing money? Show too little and you’re a “greed is good” corporate raider; too much and you’re wasting money on unproductive capital. Aristotle thought there was a golden mean between the two extremes, and finding it was a matter of fine judgment. But if ethics is about character, it’s not clear what those characteristics should be. There is yet another approach: instead of rooting ethics in character or the consequences of actions, we can focus on our actions themselves. From this perspective some things are right, some wrong—we should buy fair trade goods, we shouldn’t tell lies in advertisements. Ethics becomes a list of commandments, a catalog of “dos” and “don’ts.” When a finance official refuses to devalue a currency because they have promised not to, they are defining ethics this way. According to this approach devaluation can still be bad, even if it would make everybody better off. Many moral dilemmas arise when these three versions pull in different directions but clashes are not inevitable. Take fair trade coffee (coffee that is sold with a certification that indicates the farmers and workers who produced it were paid a fair wage), for example: buying it might have good consequences, be virtuous, and also be the right way to act in a flawed market. Common ground like this suggests that, even without agreement on where ethics applies, ethical economics is still possible. Whenever we feel queasy about “perfect” competitive markets, the problem is often rooted in a phony conception of people. The model of man on which classical economics is based—an entirely rational and selfish being—is a parody, as John Stuart Mill, the philosopher who pioneered the model, accepted. Most people—even economists— now accept that this “economic man” is a fiction. We behave like a herd; we fear losses more than we hope for gains; rarely can our brains process all the relevant facts. These human quirks mean we can never make purely “rational” decisions. A new wave of behavioral economists, aided by neuroscientists, is trying to understand our psychology, both alone and in groups, so they can anticipate our decisions in the marketplace more accurately. But psychology can also help us understand why we react in disgust at economic injustice, or accept a moral law as universal. Which means that the relatively new science of human behavior might also define ethics for us. Ethical economics would then emerge from one of the least likely places: economists themselves.", 2, false, 11);

fc_raw_passages["T2S1P3"] = new FC_Passage("Passage 1 is adapted from Nicholas Carr, “Author Nicholas Carr: The Web Shatters Focus, Rewires Brains.” ©2010 by Condé Nast. Passage 2 is from Steven Pinker, “Mind over Mass Media.” ©2010 by The New York Times Company. \n The mental consequences of our online info-crunching are not universally bad. Certain cognitive skills are strengthened by our use of computers and the Net. These tend to involve more primitive mental functions, such as hand-eye coordination, reflex response, and the processing of visual cues. One much-cited study of video gaming revealed that after just 10 days of playing action games on computers, a group of young people had significantly boosted the speed with which they could shift their visual focus between various images and tasks. It’s likely that Web browsing also strengthens brain functions related to fast-paced problem solving, particularly when it requires spotting patterns in a welter of data. A British study of the way women search for medical information online indicated that an experienced Internet user can, at least in some cases, assess the trustworthiness and probable value of a Web page in a matter of seconds. The more we practice surfing and scanning, the more adept our brain becomes at those tasks. But it would be a serious mistake to look narrowly at such benefits and conclude that the Web is making us smarter. In a Science article published in early 2009, prominent developmental psychologist Patricia Greenfield reviewed more than 40 studies of the effects of various types of media on intelligence and learning ability. She concluded that “every medium develops some cognitive skills at the expense of others.” Our growing use of the Net and other screen-based technologies, she wrote, has led to the “widespread and sophisticated development of visual-spatial skills.” But those gains go hand in hand with a weakening of our capacity for the kind of “deep processing” that underpins “mindful knowledge acquisition, inductive analysis, critical thinking, imagination, and reflection.” We know that the human brain is highly plastic; neurons and synapses change as circumstances change. When we adapt to a new cultural phenomenon, including the use of a new medium, we end up with a different brain, says Michael Merzenich, a pioneer of the field of neuroplasticity. That means our online habits continue to reverberate in the workings of our brain cells even when we’re not at a computer. We’re exercising the neural circuits devoted to skimming and multitasking while ignoring those used for reading and thinking deeply.", 2, true, 6);

fc_raw_passages["T2S1P4"] = new FC_Passage("\nCritics of new media sometimes use science itself to press their case, citing research that shows how “experience can change the brain.” But cognitive neuroscientists roll their eyes at such talk. Yes, every time we learn a fact or skill the wiring of the brain changes; it’s not as if the information is stored in the pancreas. But the existence of neural plasticity does not mean the brain is a blob of clay pounded into shape by experience. Experience does not revamp the basic information-processing capacities of the brain. Speed-reading programs have long claimed to do just that, but the verdict was rendered by Woody Allen after he read Leo Tolstoy’s famously long novel War and Peace in one sitting: “It was about Russia.” Genuine multitasking, too, has been exposed as a myth, not just by laboratory studies but by the familiar sight of an SUV undulating between lanes as the driver cuts deals on his cell phone. Moreover, the effects of experience are highly specific to the experiences themselves. If you train people to do one thing (recognize shapes, solve math puzzles, find hidden words), they get better at doing that thing, but almost nothing else. Music doesn’t make you better at math, conjugating Latin doesn’t make you more logical, brain-training games don’t make you smarter. Accomplished people don’t bulk up their brains with intellectual calisthenics; they immerse themselves in their fields. Novelists read lots of novels, scientists read lots of science. The effects of consuming electronic media are likely to be far more limited than the panic implies. Media critics write as if the brain takes on the qualities of whatever it consumes, the informational equivalent of “you are what you eat.” As with ancient peoples who believed that eating fierce animals made them fierce, they assume that watching quick cuts in rock videos turns your mental life into quick cuts or that reading bullet points and online postings turns your thoughts into bullet points and online postings.", 2, true, 5);

fc_raw_passages["T2S1P5"] = new FC_Passage("This passage is adapted from Elizabeth Cady Stanton’s address to the 1869 Woman Suffrage Convention in Washington, DC. \n I urge a sixteenth amendment, because “manhood suffrage,” or a man’s government, is civil, religious, and social disorganization. The male element is a destructive force, stern, selfish, aggrandizing, loving war, violence, conquest, acquisition, breeding in the material and moral world alike discord, disorder, disease, and death. See what a record of blood and cruelty the pages of history reveal! Through what slavery, slaughter, and sacrifice, through what inquisitions and imprisonments, pains and persecutions, black codes and gloomy creeds, the soul of humanity has struggled for the centuries, while mercy has veiled her face and all hearts have been dead alike to love and hope! The male element has held high carnival thus far; it has fairly run riot from the beginning, overpowering the feminine element everywhere, crushing out all the diviner qualities in human nature, until we know but little of true manhood and womanhood, of the latter comparatively nothing, for it has scarce been recognized as a power until within the last century. Society is but the reflection of man himself, untempered by woman’s thought; the hard iron rule we feel alike in the church, the state, and the home. No one need wonder at the disorganization, at the fragmentary condition of everything, when we remember that man, who represents but half a complete being, with but half an idea on every subject, has undertaken the absolute control of all sublunary matters. People object to the demands of those whom they choose to call the strong-minded, because they say “the right of suffrage will make the women masculine.” That is just the difficulty in which we are involved today. Though disfranchised, we have few women in the best sense; we have simply so many reflections, varieties, and dilutions of the masculine gender. The strong, natural characteristics of womanhood are repressed and ignored independence, for so long as man feeds woman she will try to please the giver and adapt herself to his condition. To keep a foothold in society, woman must be as near like man as possible, reflect his ideas, opinions, virtues, motives, prejudices, and vices. She must respect his statutes, though they strip her of every inalienable right, and conflict with that higher law written by the finger of God on her own soul.... . . . [M]an has been molding woman to his ideas by direct and positive influences, while she, if not a negation, has used indirect means to control him, and in most cases developed the very characteristics both in him and herself that needed repression. And now man himself stands appalled at the results of his own excesses, and mourns in bitterness that falsehood, selfishness, and violence are the law of life. The need of this hour is not territory, gold mines, railroads, or specie payments but a new evangel of womanhood, to exalt purity, virtue, morality, true religion, to lift man up into the higher realms of thought and action. We ask woman’s enfranchisement, as the first step toward the recognition of that essential element in government that can only secure the health, strength, and prosperity of the nation. Whatever is done to lift woman to her true position will help to usher in a new day of peace and perfection for the race. In speaking of the masculine element, I do not wish to be understood to say that all men are hard, selfish, and brutal, for many of the most beautiful spirits the world has known have been clothed with manhood; but I refer to those characteristics, though often marked in woman, that distinguish what is called the stronger sex. For example, the love of acquisition and conquest, the very pioneers of civilization, when expended on the earth, the sea, the elements, the riches and forces of nature, are powers of destruction when used to subjugate one man to another or to sacrifice nations to ambition. Here that great conservator of woman’s love, if permitted to assert itself, as it naturally would in freedom against oppression, violence, and war, would hold all these destructive forces in check, for woman knows the cost of life better than man does, and not with her consent would one drop of blood ever be shed, one life sacrificed in vain.", 2, false, 10);

fc_raw_passages["T2S1P6"] = new FC_Passage("This passage is adapted from Geoffrey Giller, “Long a Mystery, How 500-Meter-High Undersea Waves Form Is Revealed.” ©2014 by Scientific American. \n Some of the largest ocean waves in the world are nearly impossible to see. Unlike other large waves, these rollers, called internal waves, do not ride the ocean surface. Instead, they move underwater, undetectable without the use of satellite imagery or sophisticated monitoring equipment. Despite their hidden nature, internal waves are fundamental parts of ocean water dynamics, transferring heat to the ocean depths and bringing up cold water from below. And they can reach staggering heights—some as tall as skyscrapers. Because these waves are involved in ocean mixing and thus the transfer of heat, understanding them is crucial to global climate modeling, says Tom Peacock, a researcher at the Massachusetts Institute of Technology. Most models fail to take internal waves into account. “If we want to have more and more accurate climate models, we have to be able to capture processes such as this,” Peacock says. Peacock and his colleagues tried to do just that. Their study, published in November in Geophysical Research Letters, focused on internal waves generated in the Luzon Strait, which separates Taiwan and the Philippines. Internal waves in this region, thought to be some of the largest in the world, can reach about 500 meters high. “That’s the same height as the Freedom Tower that’s just been built in New York,” Peacock says. Although scientists knew of this phenomenon in the South China Sea and beyond, they didn’t know exactly how internal waves formed. To find out, Peacock and a team of researchers from M.I.T. and Woods Hole Oceanographic Institution worked with France’s National Center for Scientific Research using a giant facility there called the Coriolis Platform. The rotating platform, about 15 meters (49.2 feet) in diameter, turns at variable speeds and can simulate Earth’s rotation. It also has walls, which means scientists can fill it with water and create accurate, large-scale simulations of various oceanographic scenarios.Peacock and his team built a carbon-fiber resin scale model of the Luzon Strait, including the islands and surrounding ocean floor topography. Then they filled the platform with water of varying salinity to replicate the different densities found at the strait, with denser, saltier water below and lighter, less briny water above. Small particles were added to the solution and illuminated with lights from below in order to track how the liquid moved. Finally, they re-created tides using two large plungers to see how the internal waves themselves formed. The Luzon Strait’s underwater topography, with a distinct double-ridge shape, turns out to be responsible for generating the underwater waves. As the tide rises and falls and water moves through the strait, colder, denser water is pushed up over the ridges into warmer, less dense layers above it. This action results in bumps of colder water trailed by warmer water that generate an internal wave. As these waves move toward land, they become steeper—much the same way waves at the beach become taller before they hit the shore—until they break on a continental shelf. The researchers were also able to devise a mathematical model that describes the movement and formation of these waves. Whereas the model is specific to the Luzon Strait, it can still help researchers understand how internal waves are generated in other places around the world. Eventually, this information will be incorporated into global climate models, making them more accurate. “It’s very clear, within the context of these [global climate] models, that internal waves play a role in driving ocean circulations,” Peacock says.", 2, false, 10);

fc_raw_passages["T3S1P1"] = new FC_Passage("This passage is adapted from Saki, “The Schartz-Metterklume Method.” Originally published in 1911. \n Lady Carlotta stepped out on to the platform of the small wayside station and took a turn or two up and down its uninteresting length, to kill time till the train should be pleased to proceed on its way. Then, in the roadway beyond, she saw a horse struggling with a more than ample load, and a carter of the sort that seems to bear a sullen hatred against the animal that helps him to earn a living. Lady Carlotta promptly betook her to the roadway, and put rather a different complexion on the struggle. Certain of her acquaintances were wont to give her plentiful admonition as to the undesirability of interfering on behalf of a distressed animal, such interference being “none of her business.” Only once had she put the doctrine of non-interference into practice, when one of its most eloquent exponents had been besieged for nearly three hours in a small and extremely uncomfortable may-tree by an angry boar-pig, while Lady Carlotta, on the other side of the fence, had proceeded with the water-colour sketch she was engaged on, and refused to interfere between the boar and his prisoner. It is to be feared that she lost the friendship of the ultimately rescued lady. On this occasion she merely lost the train, which gave way to the first sign of impatience it had shown throughout the journey, and steamed off without her. She bore the desertion with philosophical indifference; her friends and relations were thoroughly well used to the fact of her luggage arriving without her. She wired a vague non-committal message to her destination to say that she was coming on “by another train.” Before she had time to think what her next move might be she was confronted by an imposingly attired lady, who seemed to be taking a prolonged mental inventory of her clothes and looks. “You must be Miss Hope, the governess I’ve come to meet,” said the apparition, in a tone that admitted of very little argument. “Very well, if I must I must,” said Lady Carlotta to herself with dangerous meekness. “I am Mrs. Quabarl,” continued the lady; “and where, pray, is your luggage?” “It’s gone astray,” said the alleged governess, falling in with the excellent rule of life that the absent are always to blame; the luggage had, in point of fact, behaved with perfect correctitude. “I’ve just telegraphed about it,” she added, with a nearer approach to truth. “How provoking,” said Mrs. Quabarl; “these railway companies are so careless. However, my maid can lend you things for the night,” and she led the way to her car. During the drive to the Quabarl mansion Lady Carlotta was impressively introduced to the nature of the charge that had been thrust upon her; she learned that Claude and Wilfrid were delicate, sensitive young people, that Irene had the artistic temperament highly developed, and that Viola was something or other else of a mould equally commonplace among children of that class and type in the twentieth century. “I wish them not only to be TAUGHT,” said Mrs. Quabarl, “but INTERESTED in what they learn. In their history lessons, for instance, you must try to make them feel that they are being introduced to the life-stories of men and women who really lived, not merely committing a mass of names and dates to memory. French, of course, I shall expect you to talk at meal-times several days in the week.” “I shall talk French four days of the week and Russian in the remaining three.” “Russian? My dear Miss Hope, no one in the house speaks or understands Russian.” “That will not embarrass me in the least,” said Lady Carlotta coldly. Mrs. Quabarl, to use a colloquial expression, was knocked off her perch. She was one of those imperfectly self-assured individuals who are magnificent and autocratic as long as they are not seriously opposed. The least show of unexpected resistance goes a long way towards rendering them cowed and apologetic. When the new governess failed to express wondering admiration of the large newly-purchased and expensive car, and lightly alluded to the superior advantages of one or two makes which had just been put on the market, the discomfiture of her patroness became almost abject. Her feelings were those which might have animated a general of ancient warfaring days, on beholding his heaviest battle-elephant ignominiously driven off the field by slingers and javelin throwers.", 3, false, 10);

fc_raw_passages["T3S1P2"] = new FC_Passage("This passage is adapted from Taras Grescoe, Straphanger: Saving Our Cities and Ourselves from the Automobile. ©2012 by Taras Grescoe. \n Though there are 600 million cars on the planet, and counting, there are also seven billion people, which means that for the vast majority of us getting around involves taking buses, ferryboats, commuter trains, streetcars, and subways. In other words, traveling to work, school, or the market means being a straphanger: somebody who, by choice or necessity, relies on public transport, rather than a privately owned automobile. Half the population of New York, Toronto, and London do not own cars. Public transport is how most of the people of Asia and Africa, the world’s most populous continents, travel. Every day, subway systems carry 155 million passengers, thirty-four times the number carried by all the world’s airplanes, and the global public transport market is now valued at $428 billion annually. A century and a half after the invention of the internal combustion engine, private car ownership is still an anomaly. And yet public transportation, in many minds, is the opposite of glamour—a squalid last resort for those with one too many impaired driving charges, too poor to afford insurance, or too decrepit to get behind the wheel of a car. In much of North America, they are right: taking transit is a depressing experience. Anybody who has waited far too long on a street corner for the privilege of boarding a lurching, overcrowded bus, or wrestled luggage onto subways and shuttles to get to a big city airport, knows that transit on this continent tends to be underfunded, ill-maintained, and ill-planned. Given the opportunity, who wouldn’t drive? Hopping in a car almost always gets you to your destination more quickly. It doesn’t have to be like this. Done right, public transport can be faster, more comfortable, and cheaper than the private automobile. In Shanghai, German-made magnetic levitation trains skim over elevated tracks at 266 miles an hour, whisking people to the airport at a third of the speed of sound. In provincial French towns, electric-powered streetcars run silently on rubber tires, sliding through narrow streets along a single guide rail set into cobblestones. From Spain to Sweden, Wi-Fi equipped high-speed trains seamlessly connect with highly ramified metro networks, allowing commuters to work on laptops as they prepare for same-day meetings in once distant capital cities. In Latin America, China, and India, working people board fast-loading buses that move like subway trains along dedicated busways, leaving the sedans and SUVs of the rich mired in dawn-to-dusk traffic jams. And some cities have transformed their streets into cycle-path freeways, making giant strides in public health and safety and the sheer livability of their neighborhoods—in the process turning the workaday bicycle into a viable form of mass transit. If you credit the demographers, this transit trend has legs. The “Millenials,” who reached adulthood around the turn of the century and now outnumber baby boomers, tend to favor cities over suburbs, and are far more willing than their parents to ride buses and subways. Part of the reason is their ease with iPads, MP3 players, Kindles, and smartphones: you can get some serious texting done when you’re not driving, and earbuds offer effective insulation from all but the most extreme commuting annoyances. Even though there are more teenagers in the country than ever, only ten million have a driver’s license (versus twelve million a generation ago). Baby boomers may have been raised in Leave It to Beaver suburbs, but as they retire, a significant contingent is favoring older cities and compact towns where they have the option of walking and riding bikes. Seniors, too, are more likely to use transit, and by 2025, there will be 64 million Americans over the age of sixty-five. Already, dwellings in older neighborhoods in Washington, D.C., Atlanta, and Denver, especially those near light-rail or subway stations, are commanding enormous price premiums over suburban homes. The experience of European and Asian cities shows that if you make buses, subways, and trains convenient, comfortable, fast, and safe, a surprisingly large percentage of citizens will opt to ride rather than drive.", 3, false, 11);

fc_raw_passages["T3S1P3"] = new FC_Passage("This passage is adapted from Thor Hanson, Feathers. ©2011 by Thor Hanson. Scientists have long debated how the ancestors of birds evolved the ability to fly. The ground-up theory assumes they were fleet-footed ground dwellers that captured prey by leaping and flapping their upper limbs. The tree-down theory assumes they were tree climbers that leapt and glided among branches. \n At field sites around the world, Ken Dial saw a pattern in how young pheasants, quail, tinamous, and other ground birds ran along behind their parents. “They jumped up like popcorn,” he said, describing how they would flap their half-formed wings and take short hops into the air. So when a group of graduate students challenged him to come up with new data on the age-old ground-up-tree-down debate, he designed a project to see what clues might lie in how baby game birds learned to fly. Ken settled on the Chukar Partridge as a model species, but he might not have made his discovery without a key piece of advice from the local rancher in Montana who was supplying him with birds. When the cowboy stopped by to see how things were going, Ken showed him his nice, tidy laboratory setup and explained how the birds’ first hops and flights would be measured. The rancher was incredulous. “He took one look and said, in pretty colorful language, ‘What are those birds doing on the ground? They hate to be on the ground! Give them something to climb on!’ ” At first it seemed unnatural—ground birds don’t like the ground? But as he thought about it Ken realized that all the species he’d watched in the wild preferred to rest on ledges, low branches, or other elevated perches where they were safe from predators. They really only used the ground for feeding and traveling. So he brought in some hay bales for the Chukars to perch on and then left his son in charge of feeding and data collection while he went away on a short work trip. Barely a teenager at the time, young Terry Dial was visibly upset when his father got back. “I asked him how it went,” Ken recalled, “and he said, ‘Terrible! The birds are cheating!’ ” Instead of flying up to their perches, the baby Chukars were using their legs. Time and again Terry had watched them run right up the side of a hay bale, flapping all the while. Ken dashed out to see for himself, and that was the “aha” moment. “The birds were using their wings and legs cooperatively,” he told me, and that single observation opened up a world of possibilities. Working together with Terry (who has since gone on to study animal locomotion), Ken came up with a series of ingenious experiments, filming the birds as they raced up textured ramps tilted at increasing angles. As the incline increased, the partridges began to flap, but they angled their wings differently from birds in flight. They aimed their flapping down and backward, using the force not for lift but to keep their feet firmly pressed against the ramp. “It’s like the spoiler on the back of a race car,” he explained, which is a very apt analogy. In Formula One racing, spoilers are the big aerodynamic fins that push the cars downward as they speed along, increasing traction and handling. The birds were doing the very same thing with their wings to help them scramble up otherwise impossible slopes. Ken called the technique WAIR, for wing-assisted incline running, and went on to document it in a wide range of species. It not only allowed young birds to climb vertical surfaces within the first few weeks of life but also gave adults an energy-efficient alternative to flying. In the Chukar experiments, adults regularly used WAIR to ascend ramps steeper than 90 degrees, essentially running up the wall and onto the ceiling. In an evolutionary context, WAIR takes on surprising explanatory powers. With one fell swoop, the Dials came up with a viable origin for the flapping flight stroke of birds (something gliding animals don’t do and thus a shortcoming of the tree-down theory) and an aerodynamic function for half-formed wings (one of the main drawbacks to the ground-up hypothesis).", 3, false, 9);

fc_raw_passages["T3S1P4"] = new FC_Passage("Passage 1 is adapted from Talleyrand et al., Report on Public Instruction. Originally published in 1791. Passage 2 is adapted from Mary Wollstonecraft, A Vindication of the Rights of Woman. Originally published in 1792. Talleyrand was a French diplomat; the Report was a plan for national education. Wollstonecraft, a British novelist and political writer, wrote Vindication in response to Talleyrand. \n That half the human race is excluded by the other half from any participation in government; that they are native by birth but foreign by law in the very land where they were born; and that they are property-owners yet have no direct influence or representation: are all political phenomena apparently impossible to explain on abstract principle. But on another level of ideas, the question changes and may be easily resolved. The purpose of all these institutions must be the happiness of the greatest number. Everything that leads us farther from this purpose is in error; everything that brings us closer is truth. If the exclusion from public employments decreed against women leads to a greater sum of mutual happiness for the two sexes, then this becomes a law that all Societies have been compelled to acknowledge and sanction. Any other ambition would be a reversal of our primary destinies; and it will never be in women’s interest to change the assignment they have received. It seems to us incontestable that our common happiness, above all that of women, requires that they never aspire to the exercise of political rights and functions. Here we must seek their interests in the wishes of nature. Is it not apparent, that their delicate constitutions, their peaceful inclinations, and the many duties of motherhood, set them apart from strenuous habits and onerous duties, and summon them to gentle occupations and the cares of the home? And is it not evident that the great conserving principle of Societies, which makes the division of powers a source of harmony, has been expressed and revealed by nature itself, when it divided the functions of the two sexes in so obviously distinct a manner? This is sufficient; we need not invoke principles that are inapplicable to the question. Let us not make rivals of life’s companions. You must, you truly must allow the persistence of a union that no interest, no rivalry, can possibly undo. Understand that the good of all demands this of you.", 3, true, 6);

fc_raw_passages["T3S1P5"] = new FC_Passage("\nContending for the rights of woman, my main argument is built on this simple principle, that if she be not prepared by education to become the companion of man, she will stop the progress of knowledge and virtue; for truth must be common to all, or it will be inefficacious with respect to its influence on general practice. And how can woman be expected to co-operate unless she know why she ought to be virtuous? unless freedom strengthen her reason till she comprehend her duty, and see in what manner it is connected with her real good? If children are to be educated to understand the true principle of patriotism, their mother must be a patriot; and the love of mankind, from which an orderly train of virtues spring, can only be produced by considering the moral and civil interest of mankind; but the education and situation of woman, at present, shuts her out from such investigations.... Consider, sir, dispassionately, these observations—for a glimpse of this truth seemed to open before you when you observed, “that to see one half of the human race excluded by the other from all participation of government, was a political phenomenon that, according to abstract principles, it was impossible to explain.” If so, on what does your constitution rest? If the abstract rights of man will bear discussion and explanation, those of woman, by a parity of reasoning, will not shrink from the same test: though a different opinion prevails in this country, built on the very arguments which you use to justify the oppression of woman—prescription. Consider—I address you as a legislator— whether, when men contend for their freedom, and to be allowed to judge for themselves respecting their own happiness, it be not inconsistent and unjust to subjugate women, even though you firmly believe that you are acting in the manner best calculated to promote their happiness? Who made man the exclusive judge, if woman partake with him the gift of reason? In this style, argue tyrants of every denomination, from the weak king to the weak father of a family; they are all eager to crush reason; yet always assert that they usurp its throne only to be useful. Do you not act a similar part, when you force all women, by denying them civil and political rights, to remain immured in their families groping in the dark?", 3, true, 5);

fc_raw_passages["T3S1P6"] = new FC_Passage("This passage is adapted from Richard J. Sharpe and Lisa Heyden, “Honey Bee Colony Collapse Disorder is Possibly Caused by a Dietary Pyrethrum Deficiency.” ©2009 by Elsevier Ltd. Colony collapse disorder is characterized by the disappearance of adult worker bees from hives. \n Honey bees are hosts to the pathogenic large ectoparasitic mite Varroa destructor (Varroa mites). These mites feed on bee hemolymph (blood) and can kill bees directly or by increasing their susceptibility to secondary infection with fungi, bacteria or viruses. Little is known about the natural defenses that keep the mite infections under control. Pyrethrums are a group of flowering plants which include Chrysanthemum coccineum, Chrysanthemum cinerariifolium, Chrysanthemum marschalli, and related species. These plants produce potent insecticides with anti-mite activity. The naturally occurring insecticides are known as pyrethrums. A synonym for the naturally occurring pyrethrums is pyrethrin and synthetic analogues of pyrethrums are known as pyrethroids. In fact, the human mite infestation known as scabies (Sarcoptes scabiei) is treated with a topical pyrethrum cream. We suspect that the bees of commercial bee colonies which are fed mono-crops are nutritionally deficient. In particular, we postulate that the problem is a diet deficient in anti-mite toxins: pyrethrums, and possibly other nutrients which are inherent in such plants. Without, at least, intermittent feeding on the pyrethrum producing plants, bee colonies are susceptible to mite infestations which can become fatal either directly or due to a secondary infection of immunocompromised or nutritionally deficient bees. This secondary infection can be viral, bacterial or fungal and may be due to one or more pathogens. In addition, immunocompromised or nutritionally deficient bees may be further weakened when commercially produced insecticides are introduced into their hives by bee keepers in an effort to fight mite infestation. We further postulate that the proper dosage necessary to prevent mite infestation may be better left to the bees, who may seek out or avoid pyrethrum containing plants depending on the amount necessary to defend against mites and the amount already consumed by the bees, which in higher doses could be potentially toxic to them. This hypothesis can best be tested by a trial wherein a small number of commercial honey bee colonies are offered a number of pyrethrum producing plants, as well as a typical bee food source such as clover, while controls are offered only the clover. Mites could then be introduced to each hive with note made as to the choice of the bees, and the effects of the mite parasites on the experimental colonies versus control colonies. It might be beneficial to test wild-type honey bee colonies in this manner as well, in case there could be some genetic difference between them that affects the bees’ preferences for pyrethrum producing flowers.", 3, false, 11);

fc_raw_passages["T4S1P1"] = new FC_Passage("This passage is adapted from MacDonald Harris, The Balloonist. ©2011 by The Estate of Donald Heiney. During the summer of 1897, the narrator of this story, a fictional Swedish scientist, has set out for the North Pole in a hydrogen-powered balloon. \n My emotions are complicated and not readily verifiable. I feel a vast yearning that is simultaneously a pleasure and a pain. I am certain of the consummation of this yearning, but I don’t know yet what form it will take, since I do not understand quite what it is that the yearning desires. For the first time there is borne in upon me the full truth of what I myself said to the doctor only an hour ago: that my motives in this undertaking are not entirely clear. For years, for a lifetime, the machinery of my destiny has worked in secret to prepare for this moment; its clockwork has moved exactly toward this time and place and no other. Rising slowly from the earth that bore me and gave me sustenance, I am carried helplessly toward an uninhabited and hostile, or at best indifferent, part of the earth, littered with the bones of explorers and the wrecks of ships, frozen supply caches, messages scrawled with chilled fingers and hidden in cairns that no eye will ever see. Nobody has succeeded in this thing, and many have died. Yet in freely willing this enterprise, in choosing this moment and no other when the south wind will carry me exactly northward at a velocity of eight knots, I have converted the machinery of my fate into the servant of my will. All this I understand, as I understand each detail of the technique by which this is carried out. What I don’t understand is why I am so intent on going to this particular place. Who wants the North Pole! What good is it! Can you eat it? Will it carry you from Gothenburg to Malmö like a railway? The Danish ministers have declared from their pulpits that participation in polar expeditions is beneficial to the soul’s eternal well-being, or so I read in a newspaper. It isn’t clear how this doctrine is to be interpreted, except that the Pole is something difficult or impossible to attain which must nevertheless be sought for, because man is condemned to seek out and know everything whether or not the knowledge gives him pleasure. In short, it is the same unthinking lust for knowledge that drove our First Parents out of the garden. And suppose you were to find it in spite of all, this wonderful place that everybody is so anxious to stand on! What would you find? Exactly nothing. A point precisely identical to all the others in a completely featureless wasteland stretching around it for hundreds of miles. It is an abstraction, a mathematical fiction. No one but a Swedish madman could take the slightest interest in it. Here I am. The wind is still from the south, bearing us steadily northward at the speed of a trotting dog. Behind us, perhaps forever, lie the Cities of Men with their teacups and their brass bedsteads. I am going forth of my own volition to join the ghosts of Bering and poor Franklin, of frozen De Long and his men. What I am on the brink of knowing, I now see, is not an ephemeral mathematical spot but myself. The doctor was right, even though I dislike him. Fundamentally I am a dangerous madman, and what I do is both a challenge to my egotism and a surrender to it.", 4, false, 10);

fc_raw_passages["T4S1P2"] = new FC_Passage("This passage is adapted from Alan Ehrenhalt, The Great Inversion and the Future of the American City. ©2013 by Vintage. Ehrenhalt is an urbanologist—a scholar of cities and their development. Demographic inversion is a phenomenon that describes the rearrangement of living patterns throughout a metropolitan area. \n We are not witnessing the abandonment of the suburbs, or a movement of millions of people back to the city all at once. The 2010 census certainly did not turn up evidence of a middle-class stampede to the nation’s cities. The news was mixed: Some of the larger cities on the East Coast tended to gain population, albeit in small increments. Those in the Midwest, including Chicago, tended to lose substantial numbers. The cities that showed gains in overall population during the entire decade tended to be in the South and Southwest. But when it comes to measuring demographic inversion, raw census numbers are an ineffective blunt instrument. A closer look at the results shows that the most powerful demographic events of the past decade were the movement of African Americans out of central cities (180,000 of them in Chicago alone) and the settlement of immigrant groups in suburbs, often ones many miles distant from downtown. Central-city areas that gained affluent residents in the first part of the decade maintained that population in the recession years from 2007 to 2009. They also, according to a 2011 study by Brookings, suffered considerably less from increased unemployment than the suburbs did. Not many young professionals moved to new downtown condos in the recession years because few such residences were being built. But there is no reason to believe that the demographic trends prevailing prior to the construction bust will not resume once that bust is over. It is important to remember that demographic inversion is not a proxy for population growth; it can occur in cities that are growing, those whose numbers are flat, and even in those undergoing a modest decline in size. America’s major cities face enormous fiscal problems, many of them the result of public pension obligations they incurred in the more prosperous years of the past two decades. Some, Chicago prominent among them, simply are not producing enough revenue to support the level of public services to which most of the citizens have grown to feel entitled. How the cities are going to solve this problem, I do not know. What I do know is that if fiscal crisis were going to drive affluent professionals out of central cities, it would have done so by now. There is no evidence that it has. The truth is that we are living at a moment in which the massive outward migration of the affluent that characterized the second half of the twentieth century is coming to an end. And we need to adjust our perceptions of cities, suburbs, and urban mobility as a result. Much of our perspective on the process of metropolitan settlement dates, whether we realize it or not, from a paper written in 1925 by the University of Chicago sociologist Ernest W. Burgess. It was Burgess who defined four urban/suburban zones of settlement: a central business district; an area of manufacturing just beyond it; then a residential area inhabited by the industrial and immigrant working class; and finally an outer enclave of single-family dwellings. Burgess was right about the urban America of 1925; he was right about the urban America of 1974. Virtually every city in the country had a downtown, where the commercial life of the metropolis was conducted; it had a factory district just beyond; it had districts of working-class residences just beyond that; and it had residential suburbs for the wealthy and the upper middle class at the far end of the continuum. As a family moved up the economic ladder, it also moved outward from crowded working-class districts to more spacious apartments and, eventually, to a suburban home. The suburbs of Burgess’s time bore little resemblance to those at the end of the twentieth century, but the theory still essentially worked. People moved ahead in life by moving farther out. But in the past decade, in quite a few places, this model has ceased to describe reality. There are still downtown commercial districts, but there are no factory districts lying next to them. There are scarcely any factories at all. These close-in parts of the city, whose few residents Burgess described as dwelling in “submerged regions of poverty, degradation and disease,” are increasingly the preserve of the affluent who work in the commercial core. And just as crucially newcomers to America are not settling on the inside and accumulating the resources to move out; they are living in the suburbs from day one.", 4,false, 11);

fc_raw_passages["T4S1P3"] = new FC_Passage("This passage is adapted from Emily Anthes, Frankenstein's Cat. ©2013 by Emily Anthes. \n When scientists first learned how to edit the genomes of animals, they began to imagine all the ways they could use this new power. Creating brightly colored novelty pets was not a high priority. Instead, most researchers envisioned far more consequential applications, hoping to create genetically engineered animals that saved human lives. One enterprise is now delivering on this dream. Welcome to the world of “pharming,” in which simple genetic tweaks turn animals into living pharmaceutical factories. Many of the proteins that our cells crank out naturally make for good medicine. Our bodies’ own enzymes, hormones, clotting factors, and antibodies are commonly used to treat cancer, diabetes, autoimmune diseases, and more. The trouble is that it’s difficult and expensive to make these compounds on an industrial scale, and as a result, patients can face shortages of the medicines they need. Dairy animals, on the other hand, are expert protein producers, their udders swollen with milk. So the creation of the first transgenic animals—first mice, then other species—in the 1980s gave scientists an idea: What if they put the gene for a human antibody or enzyme into a cow, goat, or sheep? If they put the gene in just the right place, under the control of the right molecular switch, maybe they could engineer animals that produced healing human proteins in their milk. Then doctors could collect medicine by the bucketful. Throughout the 1980s and ’90s, studies provided proof of principle, as scientists created transgenic mice, sheep, goats, pigs, cattle, and rabbits that did in fact make therapeutic compounds in their milk. At first, this work was merely gee-whiz, scientific geekery, lab-bound thought experiments come true. That all changed with ATryn, a drug produced by the Massachusetts firm GTC Biotherapeutics. ATryn is antithrombin, an anticoagulant that can be used to prevent life-threatening blood clots. The compound, made by our liver cells, plays a key role in keeping our bodies clot-free. It acts as a molecular bouncer, sidling up to clot-forming compounds and escorting them out of the bloodstream. But as many as 1 in 2,000 Americans are born with a genetic mutation that prevents them from making antithrombin. These patients are prone to clots, especially in their legs and lungs, and they are at elevated risk of suffering from fatal complications during surgery and childbirth. Supplemental antithrombin can reduce this risk, and GTC decided to try to manufacture the compound using genetically engineered goats. To create its special herd of goats, GTC used microinjection, the same technique that produced GloFish and AquAdvantage salmon. The company’s scientists took the gene for human antithrombin and injected it directly into fertilized goat eggs. Then they implanted the eggs in the wombs of female goats. When the kids were born, some of them proved to be transgenic, the human gene nestled safely in their cells. The researchers paired the antithrombin gene with a promoter (which is a sequence of DNA that controls gene activity) that is normally active in the goat’s mammary glands during milk production. When the transgenic females lactated, the promoter turned the transgene on and the goats’ udders filled with milk containing antithrombin. All that was left to do was to collect the milk, and extract and purify the protein. Et voilà—human medicine! And, for GTC, liquid gold. ATryn hit the market in 2006, becoming the world’s first transgenic animal drug. Over the course of a year, the “milking parlors” on GTC’s 300-acre farm in Massachusetts can collect more than a kilogram of medicine from a single animal.", 4, false, 10);

fc_raw_passages["T4S1P4"] = new FC_Passage("Passage 1 is adapted from Edmund Burke, Reflections on the Revolution in France. Originally published in 1790. Passage 2 is adapted from Thomas Paine, Rights of Man. Originally published in 1791. \n To avoid . . . the evils of inconstancy and versatility, ten thousand times worse than those of obstinacy and the blindest prejudice, we have consecrated the state, that no man should approach to look into its defects or corruptions but with due caution; that he should never dream of beginning its reformation by its subversion; that he should approach to the faults of the state as to the wounds of a father, with pious awe and trembling solicitude. By this wise prejudice we are taught to look with horror on those children of their country who are prompt rashly to hack that aged parent in pieces, and put him into the kettle of magicians, in hopes that by their poisonous weeds, and wild incantations, they may regenerate the paternal constitution, and renovate their father’s life. Society is indeed a contract. Subordinate contracts for objects of mere occasional interest may be dissolved at pleasure—but the state ought not to be considered as nothing better than a partnership agreement in a trade of pepper and coffee, calico or tobacco, or some other such low concern, to be taken up for a little temporary interest, and to be dissolved by the fancy of the parties. It is to be looked on with other reverence; because it is not a partnership in things subservient only to the gross animal existence of a temporary and perishable nature. It is a partnership in all science; a partnership in all art; a partnership in every virtue, and in all perfection. As the ends of such a partnership cannot be obtained in many generations, it becomes a partnership not only between those who are living, but between those who are living, those who are dead, and those who are to be born. . . . The municipal corporations of that universal kingdom are not morally at liberty at their pleasure, and on their speculations of a contingent improvement, wholly to separate and tear asunder the bands of their subordinate community, and to dissolve it into an unsocial, uncivil, unconnected chaos of elementary principles.", 4, true, 5);

fc_raw_passages["T4S1P5"] = new FC_Passage("\nEvery age and generation must be as free to act for itself, in all cases, as the ages and generations which preceded it. The vanity and presumption of governing beyond the grave, is the most ridiculous and insolent of all tyrannies. Man has no property in man; neither has any generation a property in the generations which are to follow. The Parliament or the people of 1688, or of any other period, had no more right to dispose of the people of the present day, or to bind or to control them in any shape whatever, than the parliament or the people of the present day have to dispose of, bind, or control those who are to live a hundred or a thousand years hence. Every generation is, and must be, competent to all the purposes which its occasions require. It is the living, and not the dead, that are to be accommodated. When man ceases to be, his power and his wants cease with him; and having no longer any participation in the concerns of this world, he has no longer any authority in directing who shall be its governors, or how its government shall be organized, or how administered.... Those who have quitted the world, and those who are not yet arrived at it, are as remote from each other, as the utmost stretch of mortal imagination can conceive. What possible obligation, then, can exist between them; what rule or principle can be laid down, that two nonentities, the one out of existence, and the other not in, and who never can meet in this world, that the one should control the other to the end of time?... The circumstances of the world are continually changing, and the opinions of men change also; and as government is for the living, and not for the dead, it is the living only that has any right in it. That which may be thought right and found convenient in one age, may be thought wrong and found inconvenient in another. In such cases, who is to decide, the living, or the dead?", 4, true, 5);

fc_raw_passages["T4S1P6"] = new FC_Passage("This passage is adapted from Carolyn Gramling, “Source of Mysterious Medieval Eruption Identified.” ©2013 by American Association for the Advancement of Science. \n About 750 years ago, a powerful volcano erupted somewhere on Earth, kicking off a centuries-long cold snap known as the Little Ice Age. Identifying the volcano responsible has been tricky. That a powerful volcano erupted somewhere in the world, sometime in the Middle Ages, is written in polar ice cores in the form of layers of sulfate deposits and tiny shards of volcanic glass. These cores suggest that the amount of sulfur the mystery volcano sent into the stratosphere put it firmly among the ranks of the strongest climate-perturbing eruptions of the current geological epoch, the Holocene, a period that stretches from 10,000 years ago to the present. A haze of stratospheric sulfur cools the climate by reflecting solar energy back into space. In 2012, a team of scientists led by geochemist Gifford Miller strengthened the link between the mystery eruption and the onset of the Little Ice Age by using radiocarbon dating of dead plant material from beneath the ice caps on Baffin Island and Iceland, as well as ice and sediment core data, to determine that the cold summers and ice growth began abruptly between 1275 and 1300 C.E. (and became intensified between 1430 and 1455 C.E.). Such a sudden onset pointed to a huge volcanic eruption injecting sulfur into the stratosphere and starting the cooling. Subsequent, unusually large and frequent eruptions of other volcanoes, as well as sea-ice/ocean feedbacks persisting long after the aerosols have been removed from the atmosphere, may have prolonged the cooling through the 1700s. Volcanologist Franck Lavigne and colleagues now think they’ve identified the volcano in question: Indonesia’s Samalas. One line of evidence, they note, is historical records. According to Babad Lombok, records of the island written on palm leaves in Old Javanese, Samalas erupted catastrophically before the end of the 13th century, devastating surrounding villages—including Lombok’s capital at the time, Pamatan—with ash and fast-moving sweeps of hot rock and gas called pyroclastic flows. The researchers then began to reconstruct the formation of the large, 800-meter-deep caldera [a basin-shaped volcanic crater] that now sits atop the volcano. They examined 130 outcrops on the flanks of the volcano, exposing sequences of pumice—ash hardened into rock—and other pyroclastic material. The volume of ash deposited, and the estimated height of the eruption plume (43 kilometers above sea level) put the eruption’s magnitude at a minimum of 7 on the volcanic explosivity index (which has a scale of 1 to 8)—making it one of the largest known in the Holocene. The team also performed radiocarbon analyses on carbonized tree trunks and branches buried within the pyroclastic deposits to confirm the date of the eruption; it could not, they concluded, have happened before 1257 C.E., and certainly happened in the 13th century. It’s not a total surprise that an Indonesian volcano might be the source of the eruption, Miller says. “An equatorial eruption is more consistent with the apparent climate impacts.” And, he adds, with sulfate appearing in both polar ice caps—Arctic and Antarctic—there is “a strong consensus” that this also supports an equatorial source. Another possible candidate—both in terms of timing and geographical location—is Ecuador’s Quilotoa, estimated to have last erupted between 1147 and 1320 C.E. But when Lavigne’s team examined shards of volcanic glass from this volcano, they found that they didn’t match the chemical composition of the glass found in polar ice cores, whereas the Samalas glass is a much closer match. That, they suggest, further strengthens the case that Samalas was responsible for the medieval “year without summer” in 1258 C.E.", 4, false, 11);

var fc_raw_questions_data = ["1. Which choice best describes what happens in the passage? A) One character argues with another character who intrudes on her home. B) One character receives a surprising request from another character. C) One character reminisces about choices she has made over the years. D) One character criticizes another character for pursuing an unexpected course of action. 2. Which choice best describes the developmental pattern of the passage? A) A careful analysis of a traditional practice B) A detailed depiction of a meaningful encounter C) A definitive response to a series of questions D) A cheerful recounting of an amusing anecdote 3. As used in line 1 and line 65, “directly” most nearly means A) frankly. B) confidently. C) without mediation. D) with precision. 4. Which reaction does Akira most fear from Chie? A) She will consider his proposal inappropriate. B) She will mistake his earnestness for immaturity. C) She will consider his unscheduled visit an imposition. D) She will underestimate the sincerity of his emotions. 5. Which choice provides the best evidence for the answer to the previous question? A) Line 33 (“His voice... refined”) B) Lines 49-51 (“You... mind”) C) Lines 63-64 (“Please... proposal”) D) Lines 71-72 (“Eager... face”) 6. In the passage, Akira addresses Chie with A) affection but not genuine love. B) objectivity but not complete impartiality. C) amusement but not mocking disparagement. D) respect but not utter deference. 7. The main purpose of the first paragraph is to A) describe a culture. B) criticize a tradition. C) question a suggestion. D) analyze a reaction. 8. As used in line 2, “form” most nearly means A) appearance. B) custom. C) structure. D) nature. 9. Why does Akira say his meeting with Chie is “a matter of urgency” (line 32)? A) He fears that his own parents will disapprove of Naomi. B) He worries that Naomi will reject him and marry someone else. C) He has been offered an attractive job in another country. D) He knows that Chie is unaware of his feelings for Naomi. 10. Which choice provides the best evidence for the answer to the previous question? A) Line 39 (“I don’t... you”) B) Lines 39-42 (“Normally... community”) C) Lines 58-59 (“Depending... Japan”) D) Lines 72-73 (“I see... you”) [PASSAGE2] 11. The authors most likely use the examples in lines 1-9 of the passage (“Every... showers”) to highlight the A) regularity with which people shop for gifts. B) recent increase in the amount of money spent on gifts. C) anxiety gift shopping causes for consumers. D) number of special occasions involving gift-giving. 12. In line 10, the word “ambivalent” most nearly means A) unrealistic. B) conflicted. C) apprehensive. D) supportive. 13. The authors indicate that people value gift-giving because they feel it A) functions as a form of self-expression. B) is an inexpensive way to show appreciation. C) requires the gift-recipient to reciprocate. D) can serve to strengthen a relationship. 14. Which choice provides the best evidence for the answer to the previous question? A) Lines 10-13 (“Many... peers”) B) Lines 22-23 (“People... own”) C) Lines 31-32 (“Research... perspectives”) D) Lines 44-47 (“Although... unfounded”) 15. The “social psychologists” mentioned in paragraph 2 (lines 17-34) would likely describe the “deadweight loss” phenomenon as A) predictable. B) questionable. C) disturbing. D) unprecedented. 16. The passage indicates that the assumption made by gift-givers in lines 41-44 may be A) insincere. B) unreasonable. C) incorrect. D) substantiated. 17. Which choice provides the best evidence for the answer to the previous question? A) Lines 53-55 (“Perhaps... consideration”) B) Lines 55-60 (“According... relationship”) C) Lines 63-65 (“As... consideration”) D) Lines 75-78 (“In... relations”) 18. As it is used in line 54, “convey” most nearly means A) transport. B) counteract. C) exchange. D) communicate. 19. The authors refer to work by Camerer and others (line 56) in order to A) offer an explanation. B) introduce an argument. C) question a motive. D) support a conclusion. 20. The graph following the passage offers evidence that gift-givers base their predictions of how much a gift will be appreciated on A) the appreciation level of the gift-recipients. B) the monetary value of the gift. C) their own desires for the gifts they purchase. D) their relationship with the gift-recipients. 21. The authors would likely attribute the differences in gift-giver and recipient mean appreciation as represented in the graph to A) an inability to shift perspective. B) an increasingly materialistic culture. C) a growing opposition to gift-giving. D) a misunderstanding of intentions. 22. The authors use the word “backbone” in lines 3 and 39 to indicate that A) only very long chains of DNA can be taken from an organism with a spinal column. B) the main structure of a chain in a DNA molecule is composed of repeating units. C) a chain in a DNA molecule consists entirely of phosphate groups or of sugars. D) nitrogenous bases form the main structural unit of DNA. 23.  A student claims that nitrogenous bases pair randomly with one another. Which of the following statements in the passage contradicts the student’s claim? A) Lines 5-6 (“To each... types”) B) Lines 9-10 (“So far... irregular”) C) Lines 23-25 (“The bases... other”) D) Lines 27-29 (“One member... chains”) 24.  In the second paragraph (lines 12-19), what do the authors claim to be a feature of biological interest? A) The chemical formula of DNA B) The common fiber axis C) The X-ray evidence D) DNA consisting of two chains 25.  The authors’ main purpose of including the information about X-ray evidence and density is to A) establish that DNA is the molecule that carries the genetic information. B) present an alternate hypothesis about the composition of a nucleotide. C) provide support for the authors’ claim about the number of chains in a molecule of DNA. D) confirm the relationship between the density of DNA and the known chemical formula of DNA. 26.  Based on the passage, the authors’ statement “If a pair consisted of two purines, for example, there would not be room for it” (lines 29-30) implies that a pair A) of purines would be larger than the space between a sugar and a phosphate group. B) of purines would be larger than a pair consisting of a purine and a pyrimidine. C) of pyrimidines would be larger than a pair of purines. D) consisting of a purine and a pyrimidine would be larger than a pair of pyrimidines. 27. The authors’ use of the words “exact,” “specific,” and “complement” in lines 47-49 in the final paragraph functions mainly to A) confirm that the nucleotide sequences are known for most molecules of DNA. B) counter the claim that the sequences of bases along a chain can occur in any order. C) support the claim that the phosphate-sugar backbone of the authors’ model is completely regular. D) emphasize how one chain of DNA may serve as a template to be copied during DNA replication. 28. Based on the table and passage, which choice gives the correct percentages of the purines in yeast DNA? A) 17 .1% and 18 .7% B) 17 .1% and 32 .9% C) 18 .7% and 31 .3% D) 31 .3% and 32 .9% 29. Do the data in the table support the authors’ proposed pairing of bases in DNA? A) Yes, because for each given organism, the percentage of adenine is closest to the percentage of thymine, and the percentage of guanine is closest to the percentage of cytosine. B) Yes, because for each given organism, the percentage of adenine is closest to the percentage of guanine, and the percentage of cytosine is closest to the percentage of thymine. C) No, because for each given organism, the percentage of adenine is closest to the percentage of thymine, and the percentage of guanine is closest to the percentage of cytosine. D) No, because for each given organism, the percentage of adenine is closest to the percentage of guanine, and the percentage of cytosine is closest to the percentage of thymine. 30. According to the table, which of the following pairs of base percentages in sea urchin DNA provides evidence in support of the answer to the previous question? A) 17 .3% and 17 .7% B) 17 .3% and 32 .1% C) 17 .3% and 32 .8% D) 17 .7% and 32 .8% 31. Based on the table, is the percentage of adenine in each organism’s DNA the same or does it vary, and which statement made by the authors is most consistent with that data? A) The same; “Two of... pyrimidines” (lines 6-8) B) The same; “The important... structure” (lines 25-26) C) It varies; “Adenine... thymine” (lines 36-38) D) It varies; “It follows... information” (lines 41-45) 32. The main purpose of the passage is to A) emphasize the value of a tradition. B) stress the urgency of an issue. C) highlight the severity of social divisions. D) question the feasibility of an undertaking.  33. The central claim of the passage is that A) educated women face a decision about how to engage with existing institutions. B) women can have positions of influence in English society only if they give up some of their traditional roles. C) the male monopoly on power in English society has had grave and continuing effects. D) the entry of educated women into positions of power traditionally held by men will transform those positions. 34. Woolf uses the word “we” throughout the passage mainly to A) reflect the growing friendliness among a group of people. B) advance the need for candor among a group of people. C) establish a sense of solidarity among a group of people. D) reinforce the need for respect among a group of people. 35. According to the passage, Woolf chooses the setting of the bridge because it A) is conducive to a mood of fanciful reflection. B) provides a good view of the procession of the sons of educated men. C) is within sight of historic episodes to which she alludes. D) is symbolic of the legacy of past and present sons of educated men. 36. Woolf indicates that the procession she describes in the passage A) has come to have more practical influence in recent years. B) has become a celebrated feature of English public life. C) includes all of the richest and most powerful men in England. D) has become less exclusionary in its membership in recent years. 37. Which choice provides the best evidence for the answer to the previous question? A) Lines 12-17 (“There... money”) B) Lines 17-19 (“It... desert”) C) Lines 23-24 (“For... ourselves”) D) Lines 30-34 (“We... pulpit”) 38. Woolf characterizes the questions in lines 53-57 (“For we... men”) as both A) controversial and threatening. B) weighty and unanswerable. C) momentous and pressing. D) provocative and mysterious. 39. Which choice provides the best evidence for the answer to the previous question? A) Lines 46-47 (“We... questions”) B) Lines 48-49 (“And... them”) C) Line 57 (“The moment... short”) D) Line 62 (“That... Madam”) 40. Which choice most closely captures the meaning of the figurative “sixpence” referred to in lines 70 and 71? A) Tolerance B) Knowledge C) Opportunity D) Perspective 41. The range of places and occasions listed in lines 72-76 (“Let us... funerals”) mainly serves to emphasize how A) novel the challenge faced by women is. B) pervasive the need for critical reflection is. C) complex the political and social issues of the day are. D) enjoyable the career possibilities for women are. 42. In lines 9-17, the author of Passage 1 mentions several companies primarily to A) note the technological advances that make space mining possible. B) provide evidence of the growing interest in space mining. C) emphasize the large profits to be made from space mining. D) highlight the diverse ways to carry out space mining operations. 43. The author of Passage 1 indicates that space mining could have which positive effect? A) It could yield materials important to Earth’s economy. B) It could raise the value of some precious metals on Earth. C) It could create unanticipated technological innovations. D) It could change scientists’ understanding of space resources. 44. Which choice provides the best evidence for the answer to the previous question? A) Lines 18-22 (“Within... lanthanum”) B) Lines 24-28 (“They... projects”) C) Lines 29-30 (“In this... commodity”) D) Lines 41-44 (“Companies... machinery”) 45. As used in line 19, “demands” most nearly means A) offers. B) claims. C) inquiries. D) desires. 46. What function does the discussion of water in lines 35-40 serve in Passage 1? A) It continues an extended comparison that begins in the previous paragraph. B) It provides an unexpected answer to a question raised in the previous paragraph. C) It offers hypothetical examples supporting a claim made in the previous paragraph. D) It examines possible outcomes of a proposal put forth in the previous paragraph. 47. The central claim of Passage 2 is that space mining has positive potential but A) it will end up encouraging humanity’s reckless treatment of the environment. B) its effects should be thoughtfully considered before it becomes a reality. C) such potential may not include replenishing key resources that are disappearing on Earth. D) experts disagree about the commercial viability of the discoveries it could yield. 48. As used in line 68, “hold” most nearly means A) maintain. B) grip. C) restrain. D) withstand. 49. Which statement best describes the relationship between the passages? A) Passage 2 refutes the central claim advanced in Passage 1  B) Passage 2 illustrates the phenomenon described in more general terms in Passage 1 . C) Passage 2 argues against the practicality of the proposals put forth in Passage 1 . D) Passage 2 expresses reservations about developments discussed in Passage 1 . 50. The author of Passage 2 would most likely respond to the discussion of the future of space mining in lines 18-28, Passage 1, by claiming that such a future A) is inconsistent with the sustainable use of space resources. B) will be difficult to bring about in the absence of regulations. C) cannot be attained without technologies that do not yet exist. D) seems certain to affect Earth’s economy in a negative way. 51. Which choice provides the best evidence for the answer to the previous question? A) Lines 60-63 (“Some... pristine”) B) Lines 74-76 (“The resources... Earth”) C) Lines 81-83 (“One... avoided”) D) Lines 85-87 (“Without... insecure”) 52. Which point about the resources that will be highly valued in space is implicit in Passage 1 and explicit in Passage 2? A) They may be different resources from those that are valuable on Earth. B) They will be valuable only if they can be harvested cheaply. C) They are likely to be primarily precious metals and rare earth elements. D) They may increase in value as those same resources become rare on Earth.",

" 1. Which choice best summarizes the passage? A) A character describes his dislike for his new job and considers the reasons why. B) Two characters employed in the same office become increasingly competitive. C) A young man regrets privately a choice that he defends publicly. D) A new employee experiences optimism, then frustration, and finally despair. 2. The main purpose of the opening sentence of the passage is to A) establish the narrator’s perspective on a controversy. B) provide context useful in understanding the narrator’s emotional state. C) offer a symbolic representation of Edward Crimsworth’s plight. D) contrast the narrator’s good intentions with his malicious conduct. 3. During the course of the first paragraph, the narrator’s focus shifts from A) recollection of past confidence to acknowledgment of present self-doubt. B) reflection on his expectations of life as a tradesman to his desire for another job. C) generalization about job dissatisfaction to the specifics of his own situation. D) evaluation of factors making him unhappy to identification of alternatives. 4. The references to “shade” and “darkness” at the end of the first paragraph mainly have which effect? A) They evoke the narrator’s sense of dismay. B) They reflect the narrator’s sinister thoughts. C) They capture the narrator’s fear of confinement. D) They reveal the narrator’s longing for rest. 5. The passage indicates that Edward Crimsworth’s behavior was mainly caused by his A) impatience with the narrator’s high spirits. B) scorn of the narrator’s humble background. C) indignation at the narrator’s rash actions. D) jealousy of the narrator’s apparent superiority. 6. The passage indicates that when the narrator began working for Edward Crimsworth, he viewed Crimsworth as a A) harmless rival. B) sympathetic ally. C) perceptive judge. D) demanding mentor 7. Which choice provides the best evidence for the answer to the previous question? A) Lines 28-31 (“the antipathy... life”) B) Lines 38-40 (“My southern... irritated him”) C) Lines 54-56 (“Day... slumber”) D) Lines 61-62 (“I had... brother”) 8. At the end of the second paragraph, the comparisons of abstract qualities to a lynx and a snake mainly have the effect of A) contrasting two hypothetical courses of action. B) conveying the ferocity of a resolution. C) suggesting the likelihood of an altercation. D) illustrating the nature of an adversarial relationship. 9. The passage indicates that, after a long day of work, the narrator sometimes found his living quarters to be A) treacherous. B) dreary. C) predictable. D) intolerable. 10. Which choice provides the best evidence for the answer to the previous question? A) Lines 17-21 (“I should... scenes”) B) Lines 21-23 (“I should... lodgings”) C) Lines 64-67 (“Thoughts... phrases”) D) Lines 68-74 (“I walked... gleam”) 11. The main purpose of the passage is to A) consider an ethical dilemma posed by cost-benefit analysis. B) describe a psychology study of ethical economic behavior. C) argue that the free market prohibits ethical economics. D) examine ways of evaluating the ethics of economics. 12. In the passage, the author anticipates which of the following objections to criticizing the ethics of free markets? A) Smith’s association of free markets with ethical behavior still applies today. B) Free markets are the best way to generate high profits, so ethics are a secondary consideration. C) Free markets are ethical because they are made possible by devalued currency. D) Free markets are ethical because they enable individuals to make choices. 13. Which choice provides the best evidence for the answer to the previous question? A) Lines 4-5 (“Some... ethical”) B) Lines 7-10 (“But... about”) C) Lines 21-22 (“Smith... outcome”) D) Lines 52-54 (“When... way”) 14. As used in line 6, “embraced” most nearly means A) lovingly held. B) readily adopted. C) eagerly hugged. D) reluctantly used. 15. The main purpose of the fifth paragraph (lines 45-56) is to A) develop a counterargument to the claim that greed is good. B) provide support for the idea that ethics is about character. C) describe a third approach to defining ethical economics. D) illustrate that one’s actions are a result of one’s character. 16. As used in line 58, “clashes” most nearly means A) conflicts. B) mismatches. C) collisions. D) brawls. 17. Which choice best supports the author’s claim that there is common ground shared by the different approaches to ethics described in the passage? A) Lines 11-12 (“There... decision”) B) Lines 47-50 (“From... advertisements”) C) Lines 59-64 (“Take... market”) D) Lines 75-77 (“We... facts”) 18. The main idea of the final paragraph is that A) human quirks make it difficult to predict people’s ethical decisions accurately. B) people universally react with disgust when faced with economic injustice. C) understanding human psychology may help to define ethics in economics. D) economists themselves will be responsible for reforming the free market. 19. Data in the graph about per-pound coffee profits in Tanzania most strongly support which of the following statements? A) Fair trade coffee consistently earned greater profits than regular coffee earned. B) The profits earned from regular coffee did not fluctuate. C) Fair trade coffee profits increased between 2004 and 2006 . D) Fair trade and regular coffee were earning equal profits by 2008 . 20. Data in the graph indicate that the greatest difference between per-pound profits from fair trade coffee and those from regular coffee occurred during which period? A) 2000 to 2002 B) 2002 to 2004 C) 2004 to 2006 D) 2006 to 2008 21. Data in the graph provide most direct support for which idea in the passage? A) Acting on empathy can be counterproductive. B) Ethical economics is defined by character. C) Ethical economics is still possible. D) People fear losses more than they hope for gains. 22. The author of Passage 1 indicates which of the following about the use of screen-based technologies? A) It should be thoroughly studied. B) It makes the brain increasingly rigid. C) It has some positive effects. D) It should be widely encouraged. 23. Which choice provides the best evidence for the answer to the previous question? A) Lines 3-4 (“Certain... Net”) B) Lines 23-25 (“But... smarter”) C) Lines 25-29 (“Ina... ability”) D) Lines 29-31 (“She... others”) 24. The author of Passage 1 indicates that becoming adept at using the Internet can A) make people complacent about their health. B) undermine the ability to think deeply. C) increase people’s social contacts. D) improve people’s self-confidence. 25. As used in line 40, “plastic” most nearly means A) creative. B) artificial. C) malleable. D) sculptural. 26. The author of Passage 2 refers to the novel War and Peace primarily to suggest that Woody Allen A) did not like Tolstoy’s writing style. B) could not comprehend the novel by speed-reading it. C) had become quite skilled at multitasking. D) regretted having read such a long novel. 27. According to the author of Passage 2, what do novelists and scientists have in common? A) They take risks when they pursue knowledge. B) They are eager to improve their minds. C) They are curious about other subjects. D) They become absorbed in their own fields. 28. The analogy in the final sentence of Passage 2 has primarily which effect? A) It uses ornate language to illustrate a difficult concept. B) It employs humor to soften a severe opinion of human behavior. C) It alludes to the past to evoke a nostalgic response. D) It criticizes the view of a particular group. 29. The main purpose of each passage is to A) compare brain function in those who play games on the Internet and those who browse on it. B) report on the problem-solving skills of individuals with varying levels of Internet experience. C) take a position on increasing financial support for studies related to technology and intelligence. D) make an argument about the effects of electronic media use on the brain. 30. Which choice best describes the relationship between the two passages? A) Passage 2 relates first-hand experiences that contrast with the clinical approach in Passage 1 . B) Passage 2 critiques the conclusions drawn from the research discussed in Passage 1 . C) Passage 2 takes a high-level view of a result that Passage 1 examines in depth. D) Passage 2 predicts the negative reactions that the findings discussed in Passage 1 might produce. 31. On which of the following points would the authors of both passages most likely agree? A) Computer-savvy children tend to demonstrate better hand-eye coordination than do their parents. B) Those who criticize consumers of electronic media tend to overreact in their criticism. C) Improved visual-spatial skills do not generalize to improved skills in other areas. D) Internet users are unlikely to prefer reading onscreen text to reading actual books. 32. Which choice provides the best evidence that the author of Passage 2 would agree to some extent with the claim attributed to Michael Merzenich in lines 41-43, Passage 1? A) Lines 51-53 (“Critics... brain”) B) Lines 54-56 (“Yes... changes”) C) Lines 57-59 (“But... experience”) D) Lines 83-84 (“Media... consumes”) 33. The central problem that Stanton describes in the passage is that women have been A) denied equal educational opportunities, which has kept them from reaching their potential. B) prevented from exerting their positive influence on men, which has led to societal breakdown. C) prevented from voting, which has resulted in poor candidates winning important elections. D) blocked by men from serving as legislators, which has allowed the creation of unjust laws. 34. Stanton uses the phrase “high carnival” (line 15) mainly to emphasize what she sees as the A) utter domination of women by men. B) freewheeling spirit of the age. C) scandalous decline in moral values. D) growing power of women in society. 35. Stanton claims that which of the following was a relatively recent historical development? A) The control of society by men B) The spread of war and injustice C) The domination of domestic life by men D) The acknowledgment of women’s true character 36. Which choice provides the best evidence for the answer to the previous question? A) Lines 3-7 (“The male... death”) B) Lines 15-22 (“The male... century”) C) Lines 22-25 (“Society... home”) D) Lines 48-52 (“[M]an... repression”) 37. As used in line 24, “rule” most nearly refers to A) a general guideline. B) a controlling force. C) an established habit. D) a procedural method. 38. It can reasonably be inferred that “the strong-minded” (line 32) was a term generally intended to A) praise women who fight for their long-denied rights. B) identify women who demonstrate intellectual skill. C) criticize women who enter male-dominated professions. D) condemn women who agitate for the vote for their sex. 39. As used in line 36, “best” most nearly means A) superior. B) excellent. C) genuine. D) rarest. 40. Stanton contends that the situation she describes in the passage has become so dire that even men have begun to A) lament the problems they have created. B) join the call for woman suffrage. C) consider women their social equals. D) ask women how to improve civic life. 41. Which choice provides the best evidence for the answer to the previous question? A) Lines 25-30 (“No one... matters”) B) Lines 53-55 (“And now... life”) C) Lines 56-60 (“The need... action”) D) Lines 61-64 (“We ask... nation”) 42. The sixth paragraph (lines 67-78) is primarily concerned with establishing a contrast between A) men and women. B) the spiritual world and the material world. C) bad men and good men. D) men and masculine traits. 43. The first paragraph serves mainly to A) explain how a scientific device is used. B) note a common misconception about an event. C) describe a natural phenomenon and address its importance. D) present a recent study and summarize its findings. 44. As used in line 19, “capture” is closest in meaning to A) control. B) record. C) secure. D) absorb. 45. According to Peacock, the ability to monitor internal waves is significant primarily because A) it will allow scientists to verify the maximum height of such waves. B) it will allow researchers to shift their focus to improving the quality of satellite images. C) the study of wave patterns will enable regions to predict and prevent coastal damage. D) the study of such waves will inform the development of key scientific models. 46. Which choice provides the best evidence for the answer to the previous question? A) Lines 1-2 (“Some... see”) B) Lines 4-6 (“they... equipment”) C) Lines 17-19 (“If... this”) D) Lines 24-26 (“Internal... high”) 47. As used in line 65, “devise” most nearly means A) create. B) solve. C) imagine. D) begin. 48. Based on information in the passage, it can reasonably be inferred that all internal waves A) reach approximately the same height even though the locations and depths of continental shelves vary. B) may be caused by similar factors but are influenced by the distinct topographies of different regions. C) can be traced to inconsistencies in the tidal patterns of deep ocean water located near islands. D) are generated by the movement of dense water over a relatively flat section of the ocean floor. 49. Which choice provides the best evidence for the answer to the previous question? A) Lines 29-31 (“Although... formed”) B) Lines 56-58 (“As the... it”) C) Lines 61-64 (“As these... shelf”) D) Lines 67-70 (“Whereas... world”) 50. In the graph, which isotherm displays an increase in depth below the surface during the period 19:12 to 20:24? A) 9°C B) 10°C C) 11°C D) 13°C 51. Which concept is supported by the passage and by the information in the graph? A) Internal waves cause water of varying salinity to mix. B) Internal waves push denser water above layers of less dense water. C) Internal waves push bands of cold water above bands of warmer water. D) Internal waves do not rise to break the ocean’s surface. 52. How does the graph support the author’s point that internal waves affect ocean water dynamics? A) It demonstrates that wave movement forces warmer water down to depths that typically are colder. B) It reveals the degree to which an internal wave affects the density of deep layers of cold water. C) It illustrates the change in surface temperature that takes place during an isolated series of deep waves. D) It shows that multiple waves rising near the surface of the ocean disrupt the flow of normal tides.",

" 1. Which choice best summarizes the passage? A) A woman weighs the positive and negative aspects of accepting a new job. B) A woman does not correct a stranger who mistakes her for someone else. C) A woman impersonates someone else to seek revenge on an acquaintance. D) A woman takes an immediate dislike to her new employer. 2. In line 2, “turn” most nearly means A) slight movement. B) change in rotation. C) short walk. D) course correction. 3. The passage most clearly implies that other people regarded Lady Carlotta as A) outspoken. B) tactful. C) ambitious. D) unfriendly. 4. Which choice provides the best evidence for the answer to the previous question? A) Lines 10-14 (“Certain... business”) B) Lines 22-23 (“It is... lady”) C) Lines 23-26 (“On this... her”) D) Lines 30-32 (“She... train”) 5. The description of how Lady Carlotta “put the doctrine of non-interference into practice” (lines 14-15) mainly serves to A) foreshadow her capacity for deception. B) illustrate the subtle cruelty in her nature. C) provide a humorous insight into her character. D) explain a surprising change in her behavior. 6. In line 55, “charge” most nearly means A) responsibility. B) attack. C) fee. D) expense. 7. The narrator indicates that Claude, Wilfrid, Irene, and Viola are A) similar to many of their peers. B) unusually creative and intelligent. C) hostile to the idea of a governess. D) more educated than others of their age. 8. The narrator implies that Mrs. Quabarl favors a form of education that emphasizes A) traditional values. B) active engagement. C) artistic experimentation. D) factual retention. 9. As presented in the passage, Mrs. Quabarl is best described as A) superficially kind but actually selfish. B) outwardly imposing but easily defied. C) socially successful but irrationally bitter. D) naturally generous but frequently imprudent. 10. Which choice provides the best evidence for the answer to the previous question? A) Lines 49-50 (“How... careless”) B) Lines 62-68 (“I wish... memory”) C) Lines 70-73 (“I shall... Russian”) D) Lines 77-82 (“She was... apologetic”) 11. What function does the third paragraph (lines 20-34) serve in the passage as a whole? A) It acknowledges that a practice favored by the author of the passage has some limitations. B) It illustrates with detail the arguments made in the first two paragraphs of the passage. C) It gives an overview of a problem that has not been sufficiently addressed by the experts mentioned in the passage. D) It advocates for abandoning a practice for which the passage as a whole provides mostly favorable data. 12. Which choice does the author explicitly cite as an advantage of automobile travel in North America? A) Environmental impact B) Convenience C) Speed D) Cost 13. Which choice provides the best evidence for the answer to the previous question? A) Lines 5-9 (“In... automobile”) B) Lines 20-24 (“And... car”) C) Lines 24-26 (“In... experience”) D) Lines 32-34 (“Hopping... quickly”) 14. The central idea of the fourth paragraph (lines 35-57) is that A) European countries excel at public transportation. B) some public transportation systems are superior to travel by private automobile. C) Americans should mimic foreign public transportation systems when possible. D) much international public transportation is engineered for passengers to work while on board. 15. Which choice provides the best evidence for the answer to the previous question? A) Line 35 (“It... this”) B) Lines 35-37 (“Done... automobile”) C) Lines 37-40 (“In... sound”) D) Lines 44-48 (“From... cities”) 16. As used in line 58, “credit” most nearly means A) endow. B) attribute. C) believe. D) honor. 17. As used in line 61, “favor” most nearly means A) indulge. B) prefer. C) resemble. D) serve. 18. Which choice best supports the conclusion that public transportation is compatible with the use of personal electronic devices? A) Lines 59-63 (“The... subways”) B) Lines 63-67 (“Part... annoyances”) C) Lines 68-70 (“Even... ago”) D) Lines 77-81 (“Already... homes”) 19. Which choice is supported by the data in the first figure? A) The number of students using public transportation is greater than the number of retirees using public transportation. B) The number of employed people using public transportation and the number of unemployed people using public transportation is roughly the same. C) People employed outside the home are less likely to use public transportation than are homemakers. D) Unemployed people use public transportation less often than do people employed outside the home. 20. Taken together, the two figures suggest that most people who use public transportation A) are employed outside the home and take public transportation to work. B) are employed outside the home but take public transportation primarily in order to run errands. C) use public transportation during the week but use their private cars on weekends. D) use public transportation only until they are able to afford to buy a car. 21. Which choice best reflects the overall sequence of events in the passage? A) An experiment is proposed but proves unworkable; a less ambitious experiment is attempted, and it yields data that give rise to a new set of questions. B) A new discovery leads to reconsideration of a theory; a classic study is adapted, and the results are summarized. C) An anomaly is observed and simulated experimentally; the results are compared with previous findings, and a novel hypothesis is proposed. D) An unexpected finding arises during the early phase of a study; the study is modified in response to this finding, and the results are interpreted and evaluated. 22. As used in line 7, “challenged” most nearly means A) dared. B) required. C) disputed with. D) competed with. 23. Which statement best captures Ken Dial’s central assumption in setting up his research? A) The acquisition of flight in young birds sheds light on the acquisition of flight in their evolutionary ancestors. B) The tendency of certain young birds to jump erratically is a somewhat recent evolved behavior. C) Young birds in a controlled research setting are less likely than birds in the wild to require perches when at rest. D) Ground-dwelling and tree-climbing predecessors to birds evolved in parallel. 24. Which choice provides the best evidence for the answer to the previous question? A) Lines 1-4 (“At field... parents”) B) Lines 6-11 (“So when... fly”) C) Lines 16-19 (“When... measured”) D) Lines 23-24 (“At first . . . the ground”) 25. In the second paragraph (lines 12-32), the incident involving the local rancher mainly serves to A) reveal Ken Dial’s motivation for undertaking his project. B) underscore certain differences between laboratory and field research. C) show how an unanticipated piece of information influenced Ken Dial’s research. D) introduce a key contributor to the tree-down theory. 26. After Ken Dial had his “‘aha’ moment” (line 41), he A) tried to train the birds to fly to their perches. B) studied videos to determine why the birds no longer hopped. C) observed how the birds dealt with gradually steeper inclines. D) consulted with other researchers who had studied Chukar Partridges. 27. The passage identifies which of the following as a factor that facilitated the baby Chukars’ traction on steep ramps? A) The speed with which they climbed B) The position of their flapping wings C) The alternation of wing and foot movement D) Their continual hopping motions 28. As used in line 61, “document” most nearly means A) portray. B) record. C) publish. D) process. 29. What can reasonably be inferred about gliding animals from the passage? A) Their young tend to hop along beside their parents instead of flying beside them. B) Their method of locomotion is similar to that of ground birds. C) They use the ground for feeding more often than for perching. D) They do not use a flapping stroke to aid in climbing slopes. 30. Which choice provides the best evidence for the answer to the previous question? A) Lines 4-6 (“They jumped... air”) B) Lines 28-29 (“They really... traveling”) C) Lines 57-59 (“The birds... slopes”) D) Lines 72-74 (“something... theory”) 31. As used in line 21, “common” most nearly means A) average. B) shared. C) coarse. D) similar. 32. It can be inferred that the authors of Passage 1 believe that running a household and raising children A) are rewarding for men as well as for women. B) yield less value for society than do the roles performed by men. C) entail very few activities that are difficult or unpleasant. D) require skills similar to those needed to run a country or a business. 33. Which choice provides the best evidence for the answer to the previous question? A) Lines 4-6 (“they are... representation”) B) Lines 13-17 (“If the... sanction”) C) Lines 25-30 (“Is it... home”) D) Lines 30-35 (“And... manner”) 34. According to the author of Passage 2, in order for society to progress, women must A) enjoy personal happiness and financial security. B) follow all currently prescribed social rules. C) replace men as figures of power and authority. D) receive an education comparable to that of men. 35. As used in line 50, “reason” most nearly means A) motive. B) sanity. C) intellect. D) explanation. 36. In Passage 2, the author claims that freedoms granted by society’s leaders have A) privileged one gender over the other. B) resulted in a general reduction in individual virtue. C) caused arguments about the nature of happiness. D) ensured equality for all people. 37. Which choice provides the best evidence for the answer to the previous question? A) Lines 41-45 (“Contending... virtue”) B) Lines 45-47 (“truth... practice”) C) Lines 65-66 (“If so... rest”) D) Lines 72-75 (“Consider... happiness”) 38. In lines 61-65, the author of Passage 2 refers to a statement made in Passage 1 in order to A) call into question the qualifications of the authors of Passage 1 regarding gender issues. B) dispute the assertion made about women in the first sentence of Passage 1 . C) develop her argument by highlighting what she sees as flawed reasoning in Passage 1 . D) validate the concluding declarations made by the authors of Passage 1 about gender roles. 39. Which best describes the overall relationship between Passage 1 and Passage 2 ? A) Passage 2 strongly challenges the point of view in Passage 1 . B) Passage 2 draws alternative conclusions from the evidence presented in Passage 1 . C) Passage 2 elaborates on the proposal presented in Passage 1 . D) Passage 2 restates in different terms the argument presented in Passage 1 . 40. The authors of both passages would most likely agree with which of the following statements about women in the eighteenth century? A) Their natural preferences were the same as those of men. B) They needed a good education to be successful in society. C) They were just as happy in life as men were. D) They generally enjoyed fewer rights than men did. 41. How would the authors of Passage 1 most likely respond to the points made in the final paragraph of Passage 2? A) Women are not naturally suited for the exercise of civil and political rights. B) Men and women possess similar degrees of reasoning ability. C) Women do not need to remain confined to their traditional family duties. D) The principles of natural law should not be invoked when considering gender roles. 42. How do the words “can,” “may,” and “could” in the third paragraph (lines 19-41) help establish the tone of the paragraph? A) They create an optimistic tone that makes clear the authors are hopeful about the effects of their research on colony collapse disorder. B) They create a dubious tone that makes clear the authors do not have confidence in the usefulness of the research described. C) They create a tentative tone that makes clear the authors suspect but do not know that their hypothesis is correct. D) They create a critical tone that makes clear the authors are skeptical of claims that pyrethrums are inherent in mono-crops. 43. In line 42, the authors state that a certain hypothesis “can best be tested by a trial.” Based on the passage, which of the following is a hypothesis the authors suggest be tested in a trial? A) Honeybees that are exposed to both pyrethrums and mites are likely to develop a secondary infection by a virus, a bacterium, or a fungus. B) Beekeepers who feed their honeybee colonies a diet of a single crop need to increase the use of insecticides to prevent mite infestations. C) A honeybee diet that includes pyrethrums results in honeybee colonies that are more resistant to mite infestations. D) Humans are more susceptible to varroa mites as a result of consuming nutritionally deficient food crops. 44. Which choice provides the best evidence for the answer to the previous question? A) Lines 3-5 (“These mites... viruses”) B) Lines 16-18 (“In fact... cream”) C) Lines 19-21 (“We suspect... deficient”) D) Lines 24-28 (“Without... bees”) 45. The passage most strongly suggests that beekeepers’ attempts to fight mite infestations with commercially produced insecticides have what unintentional effect? A) They increase certain mite populations. B) They kill some beneficial forms of bacteria. C) They destroy bees’ primary food source. D) They further harm the health of some bees. 46. Which choice provides the best evidence for the answer to the previous question? A) Lines 1-2 (“Honey bees... mites”) B) Lines 6-7 (“Little... control”) C) Lines 31-35 (“In addition... infestation”) D) Lines 47-50 (“Mites... control colonies”) 47. As used in line 35, “postulate” most nearly means to A) make an unfounded assumption. B) put forth an idea or claim. C) question a belief or theory. D) conclude based on firm evidence. 48. The main purpose of the fourth paragraph (lines 42-50) is to A) summarize the results of an experiment that confirmed the authors’ hypothesis about the role of clover in the diets of wild-type honeybees. B) propose an experiment to investigate how different diets affect commercial honeybee colonies’ susceptibility to mite infestations. C) provide a comparative nutritional analysis of the honey produced by the experimental colonies and by the control colonies. D) predict the most likely outcome of an unfinished experiment summarized in the third paragraph (lines 19-41).49. An unstated assumption made by the authors about clover is that the plants A) do not produce pyrethrums. B) are members of the Chrysanthemum genus. C) are usually located near wild-type honeybee colonies. D) will not be a good food source for honeybees in the control colonies. 50. Based on data in the table, in what percent of colonies with colony collapse disorder were the honeybees infected by all four pathogens? A) 0 percent B) 77 percent C) 83 percent D) 100 percent 51. Based on data in the table, which of the four pathogens infected the highest percentage of honeybee colonies without colony collapse disorder? A) IAPV B) KBV C) Nosema apis D) Nosema ceranae 52. Do the data in the table provide support for the authors’ claim that infection with varroa mites increases a honeybee’s susceptibility to secondary infections? A) Yes, because the data provide evidence that infection with a pathogen caused the colonies to undergo colony collapse disorder. B) Yes, because for each pathogen, the percent of colonies infected is greater for colonies with colony collapse disorder than for colonies without colony collapse disorder. C) No, because the data do not provide evidence about bacteria as a cause of colony collapse disorder. D) No, because the data do not indicate whether the honeybees had been infected with mites.",

" 1. Over the course of the passage, the narrator’s attitude shifts from A) fear about the expedition to excitement about it. B) doubt about his abilities to confidence in them. C) uncertainty of his motives to recognition of them. D) disdain for the North Pole to appreciation of it. 2. Which choice provides the best evidence for the answer to the previous question? A) Lines 10-12 (“For... moment”) B) Lines 21-25 (“Yet... will”) C) Lines 42-44 (“And... stand on”) D) Lines 56-57 (“What... myself”) 3. As used in lines 1-2, “not readily verifiable” most nearly means A) unable to be authenticated. B) likely to be contradicted. C) without empirical support. D) not completely understood. 4. The sentence in lines 10-13 (“For years... other”) mainly serves to A) expose a side of the narrator that he prefers to keep hidden. B) demonstrate that the narrator thinks in a methodical and scientific manner. C) show that the narrator feels himself to be influenced by powerful and independent forces. D) emphasize the length of time during which the narrator has prepared for his expedition. 5. The narrator indicates that many previous explorers seeking the North Pole have A) perished in the attempt. B) made surprising discoveries. C) failed to determine its exact location. D) had different motivations than his own. 6. Which choice provides the best evidence for the answer to the previous question? A) Lines 20-21 (“Nobody... died”) B) Lines 25-27 (“All... out”) C) Lines 31-34 (“The... newspaper”) D) Lines 51-53 (“Behind... bedsteads”) 7. Which choice best describes the narrator’s view of his expedition to the North Pole? A) Immoral but inevitable B) Absurd but necessary C) Socially beneficial but misunderstood D) Scientifically important but hazardous 8. The question the narrator asks in lines 30-31 (“Will it... railway”) most nearly implies that A) balloons will never replace other modes of transportation. B) the North Pole is farther away than the cities usually reached by train. C) people often travel from one city to another without considering the implications. D) reaching the North Pole has no foreseeable benefit to humanity. 9. As used in line 49, “take the slightest interest in” most nearly means A) accept responsibility for. B) possess little regard for. C) pay no attention to. D) have curiosity about. 10. As used in line 50, “bearing” most nearly means A) carrying. B) affecting. C) yielding. D) enduring.11. Which choice best summarizes the first paragraph of the passage (lines 1-35)? A) The 2010 census demonstrated a sizeable growth in the number of middle-class families moving into inner cities. B) The 2010 census is not a reliable instrument for measuring population trends in American cities. C) Population growth and demographic inversion are distinct phenomena, and demographic inversion is evident in many American cities. D) Population growth in American cities has been increasing since roughly 2000, while suburban populations have decreased. 12. According to the passage, members of which group moved away from central-city areas in large numbers in the early 2000s? A) The unemployed B) Immigrants C) Young professionals D) African Americans 13. In line 34, “flat” is closest in meaning to A) static. B) deflated. C) featureless. D) obscure. 14. According to the passage, which choice best describes the current financial situation in many major American cities? A) Expected tax increases due to demand for public works B) Economic hardship due to promises made in past years C) Greater overall prosperity due to an increased inner-city tax base D) Insufficient revenues due to a decrease in manufacturing 15. Which choice provides the best evidence for the answer to the previous question? A) Lines 36-39 (“America’s... decades”) B) Lines 43-44 (“How . . . not know”) C) Lines 44-46 (“What... now”) D) Lines 48-51 (“The truth... end”) 16. The passage implies that American cities in 1974 A) were witnessing the flight of minority populations to the suburbs. B) had begun to lose their manufacturing sectors. C) had a traditional four-zone structure. D) were already experiencing demographic inversion. 17. Which choice provides the best evidence for the answer to the previous question? A) Lines 54-57 (“Much... Ernest W. Burgess”) B) Lines 58-59 (“It was... settlement”) C) Lines 66-71 (“Virtually... continuum”) D) Lines 72-75 (“As... home”) 18. As used in line 68, “conducted” is closest in meaning to A) carried out. B) supervised. C) regulated. D) inhibited. 19. The author of the passage would most likely consider the information in chart 1 to be A) excellent evidence for the arguments made in the passage. B) possibly accurate but too crude to be truly informative. C) compelling but lacking in historical information. D) representative of a perspective with which the author disagrees. 20. According to chart 2, the years 2000–2010 were characterized by A) less growth in metropolitan areas of all sizes than had taken place in the 1990s. B) more growth in small metropolitan areas than in large metropolitan areas. C) a significant decline in the population of small metropolitan areas compared to the 1980s. D) roughly equal growth in large metropolitan areas and nonmetropolitan areas. 21. Chart 2 suggests which of the following about population change in the 1990s? A) Large numbers of people moved from suburban areas to urban areas in the 1990s. B) Growth rates fell in smaller metropolitan areas in the 1990s. C) Large numbers of people moved from metropolitan areas to nonmetropolitan areas in the 1990s. D) The US population as a whole grew more in the 1990s than in the 1980s. 22. The primary purpose of the passage is to A) present the background of a medical breakthrough. B) evaluate the research that led to a scientific discovery. C) summarize the findings of a long-term research project. D) explain the development of a branch of scientific study. 23. The author’s attitude toward pharming is best described as one of A) apprehension. B) ambivalence. C) appreciation. D) astonishment. 24. As used in line 20, “expert” most nearly means A) knowledgeable. B) professional. C) capable. D) trained. 25. What does the author suggest about the transgenic studies done in the 1980s and 1990s? A) They were limited by the expensive nature of animal research. B) They were not expected to yield products ready for human use. C) They were completed when an anticoagulant compound was identified. D) They focused only on the molecular properties of cows, goats, and sheep. 26. Which choice provides the best evidence for the answer to the previous question? A) Lines 16-19 (“The trouble... need”) B) Lines 25-29 (“If they... milk”) C) Lines 35-36 (“At first... true”) D) Lines 37-40 (“That all... clots”) 27. According to the passage, which of the following is true of antithrombin? A) It reduces compounds that lead to blood clots. B) It stems from a genetic mutation that is rare in humans. C) It is a sequence of DNA known as a promoter. D) It occurs naturally in goats’ mammary glands. 28. Which choice provides the best evidence for the answer to the previous question? A) Lines 12-16 (“Many... more”) B) Lines 42-44 (“It acts... bloodstream”) C) Lines 44-46 (“But as... antithrombin”) D) Lines 62-65 (“The researchers... production”) 29. Which of the following does the author suggest about the “female goats” mentioned in line 59? A) They secreted antithrombin in their milk after giving birth. B) Some of their kids were not born with the antithrombin gene. C) They were the first animals to receive microinjections. D) Their cells already contained genes usually found in humans. 30. The most likely purpose of the parenthetical information in lines 63-64 is to A) illustrate an abstract concept. B) describe a new hypothesis. C) clarify a claim. D) define a term. 31. The phrase “liquid gold” (line 71) most directly suggests that A) GTC has invested a great deal of money in the microinjection technique. B) GTC’s milking parlors have significantly increased milk production. C) transgenic goats will soon be a valuable asset for dairy farmers. D) ATryn has proved to be a financially beneficial product for GTC 32. In Passage 1, Burke indicates that a contract between a person and society differs from other contracts mainly in its A) brevity and prominence. B) complexity and rigidity. C) precision and usefulness. D) seriousness and permanence. 33. As used in line 4, “state” most nearly refers to a A) style of living. B) position in life. C) temporary condition. D) political entity. 34. As used in line 22, “low” most nearly means A) petty. B) weak. C) inadequate. D) depleted. 35. It can most reasonably be inferred from Passage 2 that Paine views historical precedents as A) generally helpful to those who want to change society. B) surprisingly difficult for many people to comprehend. C) frequently responsible for human progress. D) largely irrelevant to current political decisions. 36. How would Paine most likely respond to Burke’s statement in lines 30-34, Passage 1 (“As the... born”)? A) He would assert that the notion of a partnership across generations is less plausible to people of his era than it was to people in the past. B) He would argue that there are no politically meaningful links between the dead, the living, and the unborn. C) He would question the possibility that significant changes to a political system could be accomplished within a single generation. D) He would point out that we cannot know what judgments the dead would make about contemporary issues. 37. Which choice provides the best evidence for the answer to the previous question? A) Lines 41-43 (“Every... it”) B) Lines 43-45 (“The vanity... tyrannies”) C) Lines 56-58 (“It is... accommodated”) D) Lines 67-72 (“What... time”) 38. Which choice best describes how Burke would most likely have reacted to Paine’s remarks in the final paragraph of Passage 2? A) With approval, because adapting to new events may enhance existing partnerships. B) With resignation, because changing circumstances are an inevitable aspect of life. C) With skepticism, because Paine does not substantiate his claim with examples of governments changed for the better. D) With disapproval, because changing conditions are insufficient justification for changing the form of government. 39. Which choice provides the best evidence for the answer to the previous question? A) Lines 1-4 (“To avoid... state”) B) Lines 7-9 (“he should... solicitude”) C) Lines 27-29 (“It is... perfection”) D) Lines 34-38 (“The municipal... community”) 40. Which choice best states the relationship between the two passages? A) Passage 2 challenges the primary argument of Passage 1 . B) Passage 2 advocates an alternative approach to a problem discussed in Passage 1 . C) Passage 2 provides further evidence to support an idea introduced in Passage 1 . D) Passage 2 exemplifies an attitude promoted in Passage 1 . 41. The main purpose of both passages is to A) suggest a way to resolve a particular political struggle. B) discuss the relationship between people and their government. C) evaluate the consequences of rapid political change. D) describe the duties that governments have to their citizens. 42. The main purpose of the passage is to A) describe periods in Earth’s recent geologic history. B) explain the methods scientists use in radiocarbon analysis. C) describe evidence linking the volcano Samalas to the Little Ice Age. D) explain how volcanic glass forms during volcanic eruptions. 43. Over the course of the passage, the focus shifts from A) a criticism of a scientific model to a new theory. B) a description of a recorded event to its likely cause. C) the use of ice core samples to a new method of measuring sulfates. D) the use of radiocarbon dating to an examination of volcanic glass. 44. Which choice provides the best evidence for the answer to the previous question? A) Lines 17-25 (“In 2012... 1455 C.E.”) B) Lines 43-46 (“The researchers... atop the volcano”) C) Lines 46-48 (“They examined... material”) D) Lines 55-60 (“The team... 13th century”) 45. The author uses the phrase “is written in” (line 6) most likely to A) demonstrate the concept of the hands-on nature of the work done by scientists. B) highlight the fact that scientists often write about their discoveries. C) underscore the sense of importance that scientists have regarding their work. D) reinforce the idea that the evidence is there and can be interpreted by scientists. 46. Where does the author indicate the medieval volcanic eruption most probably was located? A) Near the equator, in Indonesia B) In the Arctic region C) In the Antarctic region D) Near the equator, in Ecuador 47. Which choice provides the best evidence for the answer to the previous question? A) Lines 1-3 (“About 750 . . . Ice Age”) B) Lines 26-28 (“Such a . . . the cooling”) C) Lines 49-54 (“The volume . . . the Holocene”) D) Lines 61-64 (“It’s not... climate impacts”) 48. As used in line 68, the phrase “Another possible candidate” implies that A) powerful volcanic eruptions occur frequently. B) the effects of volcanic eruptions can last for centuries. C) scientists know of other volcanoes that erupted during the Middle Ages. D) other volcanoes have calderas that are very large. 49. Which choice best supports the claim that Quilotoa was not responsible for the Little Ice Age? A) Lines 3-4 (“Identifying... tricky”) B) Lines 26-28 (“Sucha... cooling”) C) Lines 43-46 (“The researchers... atop the volcano”) D) Lines 71-75 (“But... closer match”) 50. According to the data in the figure, the greatest below-average temperature variation occurred around what year? A) 1200 CE B) 1375 CE C) 1675 CE D) 1750 CE 51. The passage and the figure are in agreement that the onset of the Little Ice Age began A) around 1150 CE. B) just before 1300 CE. C) just before 1500 CE. D) around 1650 CE. 52. What statement is best supported by the data presented in the figure? A) The greatest cooling during the Little Ice Age occurred hundreds of years after the temperature peaks of the Medieval Warm Period. B) The sharp decline in temperature supports the hypothesis of an equatorial volcanic eruption in the Middle Ages. C) Pyroclastic flows from volcanic eruptions continued for hundreds of years after the eruptions had ended. D) Radiocarbon analysis is the best tool scientists have to determine the temperature variations after volcanic eruptions."];