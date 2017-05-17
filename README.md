# Stall.js
A version of [Oak.js](https://github.com/skyus/Oak.js) that is a cycle-accurate modified MIPS R4000 simulator for a Computer Architecture course.

System calls halt the simulation on fetch as a result. We are *NOT* gonna write an interrupt unit in TypeScript.

# Usage
Compile:

    chmod +x compile.sh
    ./compile.sh

Clean:

    chmod +x clean.sh
    ./clean.sh

# Requirements
TypeScript 2 or above, UglifyJS 2 or above, and a compatible version of Node.js. It was tested with Node v7.

If you just want to use Oak.js, it should work fine on any modern browser, bar modern versions of Internet Explorer.

## Dependencies
(aka how to use Node.js 101)

### macOS
It is recommended to use the [Homebrew package manager](https://brew.sh). Type in your terminal:

    brew install node
    npm install -g typescript
    npm install -g uglify-js

### Debian-based OSes (incl. Ubuntu)
Again, in the terminal:

    sudo apt install nodejs npm
    sudo ln -s /usr/bin/nodejs /usr/bin/node
    sudo npm install -g typescript
    sudo npm install -g uglify-js   
    
### Windows
Please use Bash on Ubuntu on Windows 10 and follow the instructions for Debian-based OSes.

# License
Mozilla Public License 2.0. Check LICENSE.
