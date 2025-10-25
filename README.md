# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

### In the project directory, you can run:
`npm run start-all`
or
`npm run dev` inside backend-server

### Before this Install Required libraries outside and inside the modules so that your application can run
`npm install`

### Open [http://localhost:5004] to view it in the browser.


### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

### `npx api install "@labs-v2/v0.28.0#37floej3hm8ayfwxz"`
Go into backend-server and run the above command so that it can be installed and can be used in backend.

## DB Creation Script
`backend-server/src/rehouzd/estimator/config/init.sql` 
in the above file we can db creation or alter script

### Things Developer Should Follow For Backend
1. Create Models for according to table structure
2. Create Services for that model to used in rest apis
3. Common Things should go into utils folder

