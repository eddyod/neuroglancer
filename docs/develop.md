# Development and build

node.js is required to build the viewer.

1. First install NVM (node version manager) per the instructions here:

    https://github.com/creationix/nvm

2. Install a recent version of Node.js if you haven't already done so:

    `nvm install stable`
    
3. Install the dependencies required by this project:

    (From within this directory)
    
    `npm i`
    
    Also re-run this any time the dependencies listed in [package.json](package.json) may have changed, such as after checking out a different revision or pulling changes.

4. To run a local server for development purposes:

    `npm run dev-server`
    
    This will start a server on <http://localhost:8080>.
   
5. To build the static version:

    `npm run build`
    
    After the build process, the frontend files are in `/dist/dev` folder.
    
# Host the static website on activebrainatlas.ucsd.edu

1. First you need to make sure that you have access to `activebrainatlas.ucsd.edu`.

2. Build the viewer: `npm run build`

2. Replace the contents in `activebrainatlas.ucsd.edu:/var/www/html/ng` with the contents in `/dist/dev`

# Development suggestions
1. All changes that are made in the existing files need to be wrapped by `/* START OF CHANGE: YOUR COMMENTS */` and `/* END OF CHANGE: YOUR COMMENTS */`

2. Try to make use the existing functionalities/functions/codes as much as possible and write fewer codes to achieve new functionalities.  

3. Recommended IDE: [Webstorm](https://www.jetbrains.com/webstorm/).
