/*

This application is part of the Twilio.org Toolkit for Nonprofits.
For complete documentation on how to use this function, please visit:

https://github.com/Twilio-org/toolkit/blob/master/docs/quiz.md

*/

/* global module, exports, require, process, console */
'use strict'

const twilio = require('twilio')
const request = require('request')

// Set up Twilio services
const client = twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN)
const sync = client.sync.services(process.env.TTK_QUIZ_SYNC_SERVICE_SID)

// Read Zapier Google Sheets Zap URL from system environment
const ZAP_URL = process.env.TTK_QUIZ_ZAP_URL

// Configure quiz questions and copy
const YES = `You got it.`
const NO = `Hmm, not quite.`
const WELCOME = `Thanks for playing Minds on King Trivia! Let's get started.`
const ENDING = `Thank you for playing!` 
const GENERAL_ERROR = `We're sorry, the quiz is not currently available. Please try again later.`
const QUESTIONS = [
  {
    question: `How old was Martin Luther King Jr. when he graduated from Morehouse College with a degree in Sociology?`,
    answer: `19`,
    answerResponse: `After skipping 9th and 12th grades and entering college at 15, MLK was 19 when he earned his first degree. He would earn another BA and a Ph.D. by 1955.`
  },
  {
    question: `How many times was MLK sent to jail?`,
    answer: `29`,
    answerResponse: `During MLK's career as an activist he was jailed 29 times, often for trumped-up offenses and civil disobedience.`
  },
  {
    question: `MLK once said "I may not get there with you. But I want you to know tonight, that we, as a people, will get to the Promised Land." In what U.S. city were these words said, shortly before he was assassinated on April 4, 1968?`,
    answer: `Memphis`,
    answerResponse: `Dr. King said these words and was later assassinated in Memphis, Tenneesee while supporting a workers' strike.`
  },
  {
    question: `And finally, for a nerdy one - which iconic sci-fi character did MLK play a role in preserving?`,
    answer: `Uhura`,
    answerResponse: `MLK convinced Nichelle Nichols to continue playing Lieutentant Uhura on "Star Trek" after the first season because she was playing a major character who did not conform to stereotypes of the day. Black actors (like Whoopi Goldberg) and space explorers (like Ronald McNair) cited Uhura as an inspiration for their work.`
  }
]

// Helper to add the quiz state to a Google Sheet via Zapier
function addToSheet(state, callback) {
  let data = state.data
  let postBody = {
    PhoneNumber: state.uniqueName
  }

  // Add each question response to the payload
  for (let i = 0, l = data.answers.length; i < l; i++) {
    postBody[`${i+1}`] = data.answers[i]
  }

  // Post result to Zapier
  request.post({
    url: ZAP_URL,
    form: postBody
  }, callback)
}

// Get the quiz state for the current texter
function fetchQuizStateForNumber(number, callback) {
  sync.documents(number).fetch().then((doc) => {
  	callback(null, doc)
  }).catch((err) => {
    // Number doesn't exist (probably) - create a new doc
    sync.documents.create({
      uniqueName: number,
      answers: []
    }).then((doc) => {
      callback(null, doc)
    }).catch((err) => {
      callback(err)
    })
  })
}

// Determine what question (if any) should be asked, and update quiz state
function determineResponse(quizState, answer, callback) {
  let answers = quizState.data.answers || []
  let currentIndex = answers.length

  // Figure out which was the last question asked
  let lastQuestionAsked = quizState.data.lastQuestionAsked
  if (!lastQuestionAsked && lastQuestionAsked !== 0) {
    lastQuestionAsked = -1
  }

  console.log(answers)
  console.log(currentIndex)
  console.log(lastQuestionAsked)

  // Get info about the current question
  let q = QUESTIONS[currentIndex]
  let a = answer.toLowerCase()
  let correctA = q.answer.toLowerCase()
  let msg = ''

  // Update a sync document with the current quiz state
  function updateQuizState(answers, lastQuestionAsked) {
    sync.documents(quizState.uniqueName).update({
      data: {
        answers: answers,
        lastQuestionAsked: lastQuestionAsked
      }
    }).then((doc) => {
      callback(null, msg)
    }).catch((err) => {
      callback(err)
    })
  }

  // For the first message, concatenate the greeting and the first question
  if (currentIndex == 0 && lastQuestionAsked === -1) {
    msg += WELCOME + '\n\n' + QUESTIONS[0].question
    updateQuizState([], 0)
  } else {
    // Check the answer and formulate the response message
    msg += (a.indexOf(correctA) > -1) ? YES : NO
    msg += ' ' + q.answerResponse + '\n\n'

    // Append the next question or the closing
    if (lastQuestionAsked === QUESTIONS.length - 1) {
      msg += ENDING

      // Add the finished survey as a row to a Google sheet, then reset the quiz
      // for the current texter.
      quizState.data.answers.push(answer)
      addToSheet(quizState, (err) => {
        if (err) return callback(err)
        updateQuizState([], -1)
      })

    } else {
      // Add most recent answer/text 
      answers.push(answer)

      // Append the next question
      msg += QUESTIONS[currentIndex + 1].question

      // Update the quiz state and return the response message
      updateQuizState(answers, currentIndex + 1)
    }
  }
}

// Handle incoming SMS responses
exports.handler = (context, event, callback) => {
  // Get answer/request text from incoming SMS body
  let answer = event.Body || ''
  let number = event.From

  // Helper to render a TwiML response to send a response message
  function renderResponse(message) {
    let twiml = new twilio.twiml.MessagingResponse()
    twiml.message(message)
    callback(null, twiml)
  }

  // helper to return a general error message and log an error
  function sendError(err) {
    console.log(err)
    renderResponse(GENERAL_ERROR)
  }

  // Kick off the set of operations to determine how we should respond
  fetchQuizStateForNumber(number, (err, state) => {
    if (err) return sendError(err)
    
    // Okay! now that we have the current state of the quiz, determine what
    // response the texter should get back
    determineResponse(state, answer, (err, responseText) => {
      if (err) return sendError(err)
      renderResponse(responseText)
    })
  })
}
