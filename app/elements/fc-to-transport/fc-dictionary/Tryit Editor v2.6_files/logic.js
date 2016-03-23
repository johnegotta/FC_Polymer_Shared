
var creative = {};

/**
 * Window onload handler.
 */
function preInit() {
  setupDom();

  if (Enabler.isInitialized()) {
    init();
  } else {
    Enabler.addEventListener(
      studio.events.StudioEvent.INIT,
      init
    );
  }
}

/**
 * Select ad elements with zepto selectors to setup dom
 */
function setupDom() {
  creative.dom = {};
  creative.dom.mainContainer = document.getElementById('main-container');
  creative.dom.exit = document.getElementById('exit');
  //Animation Elements

  creative.dom.bgImg = $('#bg-img');
  creative.dom.whiteBg = $('.white-bg');

  creative.dom.cursor = $('.email-address-shadow .left div.cursor');

  creative.dom.email = {};
  creative.dom.email.left = $('.email-address-shadow .left');
  creative.dom.email.right = $('.email-address-shadow .right');
  creative.dom.email.companyName = $('.email-company-name');
  creative.dom.email.letterone = $('.email-letter-1');
  creative.dom.email.lettertwo = $('.email-letter-2');
  creative.dom.email.letterthree = $('.email-letter-3');
  creative.dom.email.letterfour = $('.email-letter-4');
  creative.dom.at = $('.email-at-sign');
  creative.dom.dot = $('.email-dot');
  creative.dom.c = $('.email-c');
  creative.dom.o = $('.email-o');
  creative.dom.m = $('.email-m');
  creative.dom.email.allEmail = $('.email');

  creative.dom.texts = {};
  creative.dom.texts.professionalEmail = $('.professional-email-text');
  creative.dom.texts.professionalBusiness = $('.professional-business-text');

  creative.dom.gmailLogo = $('.gmail-logo');
  creative.dom.texts.gmailForWork = $('.gmail-for-work-title');
  creative.dom.texts.lookPro = $('.gmail-for-work-block h3');
  creative.dom.startNowButton = $('.start-now-button');
  creative.dom.startNowButtonShimmer = $('.icon-effect');

  creative.dom.footer = $('.footer');


}

/**
 * Ad initialisation.
 */
function init() {

  addListeners();

  // Polite loading
  if (Enabler.isVisible()) {
    show();
  }
  else {
    Enabler.addEventListener(studio.events.StudioEvent.VISIBLE, show);
  }
}

/**
 * Adds appropriate listeners at initialization time
 */
function addListeners() {
  creative.dom.exit.addEventListener('click', exitClickHandler);
}

/**
 *  Shows the ad.
 */
function show() {
  creative.dom.exit.style.display = "block";
    //run the animations

  runAnimationLoop();
}


function runAnimationLoop(){

  creative.cursorTimeline = new TimelineLite({onComplete:repeatCursorBlink});
  creative.cursorTimeline
    .to( creative.dom.cursor, 0.2, {autoAlpha: 0})
    .to( creative.dom.cursor, 0.15, {autoAlpha: 1})

  function repeatCursorBlink(){
    creative.dom.cursorInterval = setTimeout(function(){
      creative.cursorTimeline.restart();
    },300)
  }
  function stopCursorBlink(){
    clearInterval(creative.dom.cursorInterval);
  }

  creative.MainTimeline = new TimelineLite({
     onComplete:repeatMainTimeline
  });

  creative.MainTimeline

    .addLabel('letterone')
    .to( creative.dom.email.letterone, 0.2, {autoAlpha:1, delay:1.5}, 'letterone' )
    .set( creative.dom.cursor, {left: 18,delay:1.5}, 'letterone')

    .addLabel('lettertwo')
    .to( creative.dom.email.lettertwo, 0.1, {autoAlpha:1}, 'lettertwo' )
    .set( creative.dom.cursor, {left: 31}, 'lettertwo')

    .addLabel('letterthree')
    .to( creative.dom.email.letterthree, 0.1, {autoAlpha:1}, 'letterthree' )
    .set( creative.dom.cursor, {left: 41}, 'letterthree')

    .addLabel('letterfour')
    .to( creative.dom.email.letterfour, 0.1, {autoAlpha:1}, 'letterfour' )
    .set( creative.dom.cursor, {left: 54}, 'letterfour')

    .addLabel('at')
    .to( creative.dom.at, 0.1, {autoAlpha:1}, 'at' )
    .set( creative.dom.cursor, {left: 77}, 'at')

    .addLabel('dot')
    .to( creative.dom.dot, 0.1, {autoAlpha:1,delay:0.5}, 'dot' )
    .set( creative.dom.cursor, {left: 223,delay:0.5}, 'dot')

    .addLabel('c')
    .to( creative.dom.c, 0.1, {autoAlpha:1}, 'c')
    .set( creative.dom.cursor, {left: 238}, 'c')

    .addLabel('o')
    .to( creative.dom.o, 0.1, {autoAlpha:1}, 'o')
    .set( creative.dom.cursor, {left: 250}, 'o')

    .addLabel('m')
    .to( creative.dom.m, 0.2, {autoAlpha:1}, 'm')
    .set( creative.dom.cursor, {left: 274}, 'm')

    .addLabel('slide-one')
    .to(  creative.dom.bgImg, 1, {left: -80, ease: Power3.easeIn, delay:1},'slide-one')
    .to(creative.dom.email.left, 1, {left:26, ease: Power3.easeIn, delay:1},'slide-one')
    .to(creative.dom.email.right, 1, {left:249, ease: Power3.easeIn, delay:1},'slide-one')
    .to(creative.dom.whiteBg, 1,{left:319, ease: Power3.easeIn, delay:1},'slide-one' )
    .to(creative.dom.gmailLogo, 0.4, { autoAlpha:1, delay:2}, 'slide-one')
    .to(creative.dom.texts.gmailForWork, 0.4, { autoAlpha:1, delay:2}, 'slide-one')

    .addLabel('professional-text')
    .to(creative.dom.texts.professionalEmail, 0.3, { autoAlpha:1, top: 20, delay:0.5 }, 'professional-text')
    .to(creative.dom.texts.professionalBusiness, 0.3, { autoAlpha:1, top: 41, delay:1.5 }, 'professional-text')

    .addLabel('slide-two')
    .to(creative.dom.texts.professionalEmail, 0.4, { autoAlpha:0, delay:0.8 }, 'slide-two')
    .to(creative.dom.texts.professionalBusiness, 0.4, { autoAlpha:0, delay:0.8 }, 'slide-two')
    .to( creative.dom.bgImg, 1, {left: -362, ease: Power3.easeIn, delay: 1},'slide-two')
    .to(creative.dom.whiteBg, 1,{left:0, ease: Power3.easeIn, delay: 1},'slide-two' )
    .to(creative.dom.email.left, 1, {left:-245, ease: Power3.easeIn, delay: 1},'slide-two')
    .to(creative.dom.email.right, 1, {left:-62, ease: Power3.easeIn, delay: 1},'slide-two')
    .to(creative.dom.gmailLogo, 1.3, { left:-587, ease: Power3.easeIn, delay: 1}, 'slide-two')
    .to(creative.dom.texts.gmailForWork, 1.3, { left: -587, ease: Power3.easeIn, delay: 1}, 'slide-two')

    .addLabel('final-fade')
    .to(creative.dom.texts.lookPro, 0.4, { autoAlpha:1, left: -70, delay: 0.5}, 'final-fade')
    .to(creative.dom.startNowButton, 0.3, {autoAlpha:1,delay: 1.5}, 'final-fade')

    .addLabel('shimmer')
    .set(creative.dom.startNowButtonShimmer, {className: "+=shimmer"},'shimmer')
    .to(creative.dom.startNowButtonShimmer,0.6, {autoAlpha:0,delay:0.1},'shimmer')

  creative.playedOnce = false;
  function repeatMainTimeline(){
    if (creative.playedOnce == false) {
      creative.playedOnce = true;
      setTimeout(function(){
        creative.MainTimeline.restart();
      },3000)
    } else {
      stopCursorBlink()
    }
  }

}


// ---------------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------------

function exitClickHandler() {
  Enabler.exit('BackgroundExit');
}

/**
 *  Main onload handler
 */
window.addEventListener('load', preInit);
