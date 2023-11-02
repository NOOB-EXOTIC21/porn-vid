# Use an official Node.js runtime as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy all local files into the container
COPY . .

# Expose the port your app uses
EXPOSE 3000

# Define the command to run your application
CMD ["node", "app.js"]
