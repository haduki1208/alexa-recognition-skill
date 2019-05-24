'use strict';
const request = require('request');
const AWS = require('aws-sdk');
//AWS.config.region = 'ap-northeast-1';
AWS.config.loadFromPath('rootkey.json');
const Alexa = require('alexa-sdk');
const makePlainText = Alexa.utils.TextUtils.makePlainText;
const makeImage = Alexa.utils.ImageUtils.makeImage;

//Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on http://developer.amazon.com.
//Make sure to enclose your value in quotes, like this: var APP_ID = "amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1";
let APP_ID = undefined;
let HELP_MESSAGE = '終わりたい時は「おしまい」と言ってください。どうしますか？';
let HELP_REPROMPT = 'どうしますか？';
let STOP_MESSAGE = 'さようなら';

exports.handler = function(event, context, callback) {
  let alexa = Alexa.handler(event, context);
  alexa.APP_ID = APP_ID;
  alexa.registerHandlers(handlers);
  alexa.execute();
};

const handlers = {
  LaunchRequest: function() {
    this.emit('GetNewFactIntent');
  },
  GetNewFactIntent: function() {
    let self = this;
    let rekognition = new AWS.Rekognition();
    let params = {
      Image: {
        S3Object: {
          Bucket: 'isc-johotaro-photo',
          Name: 'upload.jpg'
        }
      },
      MaxLabels: 10,
      MinConfidence: 50
    };
    // 物体、シーン分析
    rekognition.detectLabels(params, callbackRecognized);

    function callbackRecognized(err, data) {
      if (err) {
        console.error(err, err.stack);
        self.emit(':tell', 'うまく写真が取得できませんでした。');
      } else {
        const API_URL =
          'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=ja';
        const body = [];
        for (let result of data.Labels) {
          body.push({
            Text: result.Name
          });
        }
        const options = {
          url: API_URL,
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.OCP_APIM_SUBSCRIPTION_KEY,
            'Content-Type': 'application/json'
          },
          body: body,
          json: true
        };

        // en -> ja 翻訳
        request.post(options, function(err, res, body) {
          if (!err && res.statusCode == 200) {
            // console.log(body[0].translations[0].text);
            callbackTranslated(body);
          } else {
            console.error(err);
            self.emit(':tell', 'うまく写真が取得できませんでした。');
          }
        });
      }
    }

    function callbackTranslated(textdatas) {
      const ImageUrl =
        'https://s3-ap-northeast-1.amazonaws.com/isc-johotaro-photo/upload.jpg';
      const itemImage = makeImage(ImageUrl);
      const listItemBuilder = new Alexa.templateBuilders.ListItemBuilder();
      const listTemplateBuilder = new Alexa.templateBuilders.ListTemplate1Builder();
      for (let word of textdatas) {
        listItemBuilder.addItem(
          null,
          word.translations[0].text,
          makePlainText(word.translations[0].text)
        );
      }
      const listItems = listItemBuilder.build();
      const listTemplate = listTemplateBuilder
        .setToken('listToken')
        .setTitle('こんなものが写ってましたよ')
        .setBackgroundImage(itemImage)
        .setListItems(listItems)
        .build();
      self.response
        .speak('こんなものが写ってましたよ。')
        .renderTemplate(listTemplate);
      self.emit(':responseReady');
    }
  },
  ElementSelected: function() {
    let message = 'あいうえお';
    this.response.speak(message + this.event.request.token);
    this.emit(':responseReady');
  },
  'AMAZON.HelpIntent': function() {
    let speechOutput = HELP_MESSAGE;
    let reprompt = HELP_REPROMPT;
    this.emit(':ask', speechOutput, reprompt);
  },
  'AMAZON.CancelIntent': function() {
    this.emit(':tell', STOP_MESSAGE);
  },
  'AMAZON.StopIntent': function() {
    this.emit(':tell', STOP_MESSAGE);
  },
  SessionEndedRequest: function() {
    // Nothing to do
  }
};
