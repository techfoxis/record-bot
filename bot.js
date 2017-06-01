'use strict'

const Eris = require('eris')
const fs = require('fs')

const records = new Map()

const bot = new Eris.CommandClient('INSERT_TOKEN', {}, {
    prefix: '!',
    disableEveryone: false,
    name: 'Record Bot',
    owner: 'Techfoxis',
    description: 'A Discord bot that records channel messages and is built on-top of Node.js.'
})

// Command Registration
const pingCommand = {
    main: {
        invoke(message, args) {
            let channel = message.channel

            channel.createMessage('Pong!')
        },
        options: {
            description: 'Pings the bot.',
            fullDescription: 'Sends a ping to the bot, which will reply with a "Pong!"',
            usage: `
            - !ping
            `
        }
    },
    command: {}
}

const recordCommand = {
    main: {
        invoke() {},
        options: {
            argsRequired: true,
            description: 'Records chat',
            fullDescription: 'Records chat messages from the channel the command was sent from.',
            usage: `
            - !record start <FileName>
            - !record stop
            `
        }
    },
    start: {
        invoke(message, args) {
            let channel = message.channel
            let recordName = args[0]

            console.log(`Starting the recording of channel: ${channel.name}`)

            startRecording(recordName, channel) 
        },
        options: {
            argsRequired: true,
            description: 'Starts recording chat.'
        }
    },
    stop: {
        invoke(message, args) {
            let channel = message.channel
            let recordEntry = records.get(channel.name)

            if (!recordEntry) {
                channel.createMessage('The current channel is not being recorded.')
                
                return
            }

            console.log(`Stopping the recording of channel: ${channel.name}`)

            stopRecording(recordEntry)
        },
        options: {
            description: 'Stops recording chat.'
        }
    },
    command: {}
}

const topicCommand = {
    main: {
        invoke(message, args) {
            let channel = message.channel
            let concatendatedTopic = args.join(' ')
            let channelMessages

            channel.createMessage(concatendatedTopic)
                .then(message => bot.pinMessage(channel.id, message.id))
                .catch(error => console.error(error.message))
        },
        options: {
            argsRequired: true,
            description: 'Sets the topic',
            fullDescription: 'Sets the current topic and pins it to the channel.',
            usage: `
            - !topic <TopicTitle>
            `
        }
    },
    command: {}
}

pingCommand.command = bot.registerCommand('ping', pingCommand.main.invoke, pingCommand.main.options)

recordCommand.command = bot.registerCommand('record', recordCommand.main.invoke, recordCommand.main.options)
recordCommand.command.registerSubcommand('start', recordCommand.start.invoke, recordCommand.start.options)
recordCommand.command.registerSubcommand('stop', recordCommand.stop.invoke, recordCommand.stop.options)

topicCommand.command = bot.registerCommand('topic', topicCommand.main.invoke, topicCommand.main.options)

// Event Handling
bot.on('ready', () => {
    console.log('Record Bot is now running')
})

bot.on('messageCreate', (message) => {
    let channel = message.channel
    let recordEntry = records.get(channel.name)

    if (recordEntry) {
        writeToRecord(message, recordEntry)
    }
})

bot.on('messageUpdate', (message) => {
    let channel = message.channel
    let recordEntry = records.get(channel.name)

    if (recordEntry) {
        writeToRecord(message, recordEntry)
    }
})

// Helper Functions
function startRecording(recordName, channel) {
    if (records.has(channel.name)) {
        channel.createMessage('This channel is already being recorded. Please stop the current record before trying to initiate a new one.')
        return
    }

    let writeStream = fs.createWriteStream(`./records/${recordName}.txt`, { flags: 'a' })
    
    records.set(channel.name, { writeStream, channel, recordName })

    channel.createMessage('This channel is now being recorded.')    
}

function stopRecording(recordEntry) {
    let channel = recordEntry.channel
    let writeStream = recordEntry.writeStream

    writeStream.end()
    records.delete(recordEntry.channel.name)

    channel.createMessage('This channel is no longer being recorded.')
}

function writeToRecord(message, recordEntry) {
    let writeStream = recordEntry.writeStream
    let timestamp = new Date()

    writeStream.write(`[${timestamp.getHours()}:${timestamp.getMinutes()}] ${ message.editedTimestamp ? '[*]' : '' } ${message.author.username}: ${message.cleanContent} \n`, (error) => {
        if (error) {
            let errorMessage = `Record Bot has experienced an error: ${error.message}`

            channel.createMessage(errorMessage)
            console.log(errorMessage)

            throw error
        }
    })
}

bot.connect()
