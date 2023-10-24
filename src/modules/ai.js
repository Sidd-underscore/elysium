const { default: axios } = require("axios");
const { gpt4APIs } = require("../../config");
const { QuickDB } = require("quick.db");
const crypto = require("crypto");
const timer = require("./timer");

const db = new QuickDB();

module.exports.gpt4 = async (messages, options) => {
    let functions = [
        {
            name: 'fetch_channels',
            description: 'Fetches all channels in the server.',
            parameters: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'fetch_roles',
            description: 'Fetches all roles in the server.',
            parameters: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'fetch_emojis',
            description: 'Fetches all emojis in the server.',
            parameters: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'fetch_pins',
            description: 'Fetches all pins in the server.',
            parameters: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'web_search',
            description: 'Search Google and return top 10 results',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Query to search on Google.'
                    }
                },
                required: ['query']
            }
        },
        {
            name: 'ai_tools',
            description: 'Searches AI tools',
            parameters: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'number',
                        description: 'Limit of the results.'
                    },
                    search: {
                        type: 'string',
                        description: 'Query to search AI tools.'
                    }
                },
                required: ['search']
            }
        },
        {
            name: 'draw_image',
            description: 'Draws an image',
            parameters: {
                type: 'object',
                properties: {
                    prompt: {
                        type: 'string',
                        description: 'The prompt you want to draw. Do not use simple and short prompts. More details means better images. You have to include as much details as possible. Prompts must be English.'
                    },
                    count: {
                        type: 'number',
                        description: 'The number of images you want to draw.'
                    }
                },
                required: ['prompt']
            }
        },
        {
            name: 'react_message',
            description: 'Reacts to the message with an emoji',
            parameters: {
                type: 'object',
                properties: {
                    emoji: {
                        type: 'string',
                        description: 'The emoji id or unicode emoji to react. Example: 1234567890 or 😂'
                    }
                },
                required: ['emoji']
            }
        },
        {
            name: 'member_mention',
            description: 'Searches members in the server and shows their mention.',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Name of the member to search.'
                    }
                },
                required: ['name']
            }
        },
        {
            name: 'send_dm',
            description: 'Sends direct message to the user. Please do not spam.',
            parameters: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        description: 'The message content to send.'
                    },
                    send_files: {
                        type: 'boolean',
                        description: 'Whether the collected files (for example drawen images) will be sent along with the nessage. Default: false'
                    }
                },
                required: ['message']
            }
        },
        {
            name: 'read_file',
            description: 'Reads a file from the message attachments. You can only read .png, .jpg, .txt and .json files. You can use this function to see the sent files.',
            parameters: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        description: 'Can only be "image" or "text". If the extension is .png or .jpg, you should use "image". If the extension is .txt or .json, you should use "text".'
                    },
                    url: {
                        type: 'string',
                        description: 'The url of the file to read.'
                    }
                },
                required: ['type', 'url']
            }
        }
    ];

    if (options.tier1) functions.push([
        {
            name: 'save_memory',
            description: 'Saves a memory. You will NOT use this for simple things. You will only use this function for necessary things that you don\'t want to forget. Example: "I\'m now friends with user 329671025312923648", "I had a fight with user 751092600890458203"',
            parameters: {
                type: 'object',
                properties: {
                    memory: {
                        type: 'string',
                        description: 'The memory to save.'
                    },
                    duration: {
                        type: 'number',
                        description: "The duration of the memory in days. (1-3) Default: 1"
                    }
                },
                required: ['memory']
            }
        }
    ]);
    if (options.tier3) functions.push([
        {
            name: 'summarize_page',
            description: 'Summarizes a web page. You can use this function to find some information about a web page.',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The url of the web page to summarize.'
                    },
                    question: {
                        type: 'string',
                        description: 'The question to ask about the web page. Don\'t use this parameter if you want to summarize the web page.'
                    }
                },
                required: ['url']
            }
        }
    ]);

    for (let api of gpt4APIs) {
        try {
            console.log((options.noFunctions || api.key === 'WEBRAFT_API_KEY') ? 'Not using functions' : 'Using functions');

            response = await axios.post(api.url, {
                model: api.model,
                messages,
                functions: (options.noFunctions || api.key === 'WEBRAFT_API_KEY') ? null : functions
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env[api.key]}`
                },
                timeout: 15000
            });
        } catch (error) {
            console.log('Error', api.url, error?.response ?? error);

            continue;
        };

        if (response.data?.choices && !['Internal Server Error', 'GPT-4 is down or your context is over 7100.'].includes(response.data?.choices?.[0]?.message?.content)) {
            console.log('Used API', api.url, 'with model', api.model);

            return response.data.choices[0];
        } else {
            console.log('Invalid response', api.url, api.model, response.data);

            continue;
        };
    };

    return null;
};

module.exports.followUp = async (reply, message, content) => {
    if (reply) reply.edit({
        content,
        allowedMentions: {
            roles: [],
            repliedUser: false
        }
    });
    else reply = await message?.reply({
        content,
        allowedMentions: {
            roles: [],
            repliedUser: false
        }
    });
};

module.exports.chatCompletion = async (messages, options) => {
    let end;
    let response;
    let reply;

    response = await this.gpt4(messages, options);

    while (!end) {
        if (!response) {
            end = 'fail';

            break;
        };
        if (response.finish_reason === 'function_call') {
            let functionResponse;

            try {
                let functionMessage = options?.functionMessages?.[response?.message?.function_call?.name] ?? 'Calling function...';
                let functionMessageContent = response?.message?.content ? `${response?.message?.content} **(${functionMessage})**` : functionMessage;

                await this.followUp(reply, options?.message, functionMessageContent);

                functionResponse = await options?.functions?.[response?.message?.function_call?.name](JSON.parse(response?.message?.function_call?.arguments), options);
            } catch (error) {
                functionResponse = 'Function call failed.';
            };

            messages.push({
                role: 'function',
                name: response?.message?.function_call?.name ?? 'unknown_function',
                response: functionResponse
            });

            response = await this.gpt4(messages, options);
        } else {
            end = 'success';

            break;
        };
    };

    if (end === 'success') return {
        response: response?.message?.content,
        reply
    };
    else return null;
};