function Variable(name, value){
  this.name = name;
  this.value = value;
}
Variable.prototype.set = function(value){
  this.value = value;
}

function Prompt(unchangingText,variableText){
  this.unchangingText = unchangingText;
  this.variableText = variableText;
}
Prompt.prototype.replaceTextWithVariables = function(){

  while(this.text.indexOf("diarrhea") != -1){

  }
}

function Question(prompt){
  this.prompt = prompt;
}
function MathQuestion(prompt,answerFunctions){
  Question.call(this, prompt);
  this.answerFunctions = answerFunctions;
}
MathQuestion.prototype = Object.create(Question.prototype);


var x = new Variable('x','x');
var y = new Variable('y','y');
var z = new Variable('z','z');
var q1 = new Question("ababababababa");
var q2 = new MathQuestion("ababababababa",[function(){return 'poop';},function(){return 'crap'}]);

console.log(q1);
// console.log(q1 instanceof Question);
// console.log(q1 instanceof MathQuestion);
 console.log(q2);
// console.log(q2 instanceof Question);
// console.log(q2 instanceof MathQuestion);
console.log(q2.answerFunctions[0]());