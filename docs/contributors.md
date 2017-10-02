# Contributing to the Twilio Toolkit for Nonprofits

Thank you for your interest in contributing to the Twilio Toolkit for Nonprofits! These apps build on Twilio's Runtime products (Functions, Assets, etc.) and APIs to provide standalone communications apps that can run 100% inside of Twilio. Our intent is to provide easy-to-use tools for users of a variety of technical ability levels to quickly deploy to solve common communications needs.

## Contributing to an application

[Pull requests](https://help.github.com/articles/creating-a-pull-request/) for existing apps are more than welcome! In the near future, we'll be manually testing contributions to existing apps until we can develop a better set of tools for mocking the Twilio Runtime environment and doing more automated testing.

## Creating a new application

The Twilio Runtime environment is maturing quickly, and has present day limitations around routes and file structures. To help manage these and keep things consistent, if you want to create a brand new application, keep the following bits in mind:

* Prefix all new function file names with `ttk_`
* Same with asset names (end users may change these at their preference)
* For now, each function must be fully self-contained (cannot use multiple files while authoring)
* For any required environment variables, please prefix them with `TTK\_APPNAME\_` - all Functions in an account currently share the same system environment variables, so we need to work around this.

## Developing functions and assets locally

Because developing in a browser text field is a drag, there is a small harness that will run your code locally for testing, providing an environment similar to where your code will run on Twilio Functions.

To get things started, install all of the Toolkit's dependencies with:

```
npm install
```

Next, create an environment configuration file. The project's environment variables are managed via the [`dotenv`](https://www.npmjs.com/package/dotenv) npm package.

```
cp .env.example .env
```

Open this file, and edit with any necessary environment variables. Minimally, you'll probably need to configure `ACCOUNT_SID` and `AUTH_TOKEN` with your Twilio account credentials from the [console](https://www.twilio.com/console).

Start the local dev server with:

```
npm start
```

This will start up the development server, and restart when your code changes. Functions in the `functions` directory will be available on `http://localhost:3000/function\_file\_name`. Static assets in the `assets` directory will also be available at `http://localhost:3000/asset\_file\_name`. Assets have priority over functions of the same name, should there be any collisions (why would you do that to yourself?).

## Managing npm dependencies

If your Function has any runtime npm dependencies, please add them to the project's package.json in the main `dependencies` array. If you make any changes to the dev server or any of the tooling for the project its self, please add those to the `devDependencies` array (`npm install --save-dev {package}`).

## Code standards and formatting

In the Twilio console, Function code is linted for undeclared globals (which every Node.js program has). To avoid confusing and/or scary linter warning icons in the browser for the end user, include the following directive at the beginning of every code file:

```js
/* global module, exports, require, process, console */
```

Code in the Twilio Toolkit is formatted according to [Standard JS](https://standardjs.com/). The `standard` tool is run when you execute `npm test`. Please fix any errors you encounter after running the tool. If you install standard globally with `npm install -g standard`, you can often run `standard --fix` to clean up small issues.

For multi-word file names, please use `snake_case` whenever possible.

### Example file template

A minimal Standard-formatted Function template would look like this.

```js
/*

This application is part of the Twilio.org Toolkit for Nonprofits.
For complete documentation on how to use this function, please visit:

https://github.com/Twilio-org/toolkit

for usage and setup instructions.

*/

/* global module, exports, require, process, console */
'use strict'

// Configure necessary Twilio objects
const twilio = require('twilio')

// Handle incoming SMS commands
exports.handler = (context, event, callback) => {
  let twiml = new twilio.twiml.MessagingResponse()
  twiml.message('Hello world!')
  callback(null, twiml)
}

```

### Instantiating a Twilio API client

In the Runtime environment there is a helper function on the `context` object to get an initialized Twilio API client. Don't use this - prefer instead to instantiate your own Twilio API client as you would normally within a Node.js program. This will allow for easier local testing (via `.env` configuration) and more efficient client instantiation at runtime.

```js
const client = twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN)
```

## Documentation standards

Remember that these apps are meant to be used by a variety of people in different roles in their organization. Please try to make your function as accessible as possible within the limitations of the Twilio platform. Each Function/app should link to a markdown document within the `docs` directory within the repository. Refer to `broadcast.md` for an example of what information to include in your docs, and in what order.

Minimally, you should document:

1. What your function does
2. Any necessary npm modules
3. Any necessary environment variables
4. Any necessary manual setup steps
5. How end users should interact with the application
