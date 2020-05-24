# **Betting bot for Discord** 
Main reason for this bot was a small community of bettors on Discord. Betting is something that normal people
do for fun, but there are a lot of people who bet seriously and they need to track their picks.
## **Why would you Discord bot for betting?**
You can track your statistics easily with Excel or any other software, but that takes time and you could easily 
forget about a pick or it's a hassle to share it with anyone else. My solution was a bot that tracks picks for you.
Policeman(Bot's name), just needs to know basic stuff and he will remember picks forever. Excel is known for its
power for mathematical formulas, but some people just don't get the concept of it, so that's the reason why
this piece of code does all the calculations on it's own.
## **List of basic functions**
* Inserting live or prematch pick
* Declaring your picks as win,loss or push
* Grabbing statistic from various web pages(images,streams)
* Editing prematch analysis
* Leaderboard
* Keeps track of deleted picks
* Downloading those stats on your local machine

## **How does it work?**
After invoking bot with basic commands(prefix + command) you get a message from the Policeman where you
can input all the data necessary. 
Picks are stored in MongoDB database on server which is backuped every day. All the calculations are also
made from same database. Bot goes through all the messages and edits those that were made by user invoking 
command. 

## **Commands and how to use it**
TO-DO



