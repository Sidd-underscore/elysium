const { default: axios } = require("axios");
const { gpt4APIs } = require("../../config");
const { QuickDB } = require("quick.db");
const crypto = require("crypto");
const timer = require("./timer");

const db = new QuickDB();

module.exports.gpt4 = async (messages, options) => {
    let apis = gpt4APIs;

    if (options?.tier3) apis.push({
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4-0613',
        key: 'OPENAI_API_KEY'
    });

    /*
    apis.push({
        url: 'https://paidapi-proxy003-webraftai.run-us-west2.goorm.app/v1/chat/completions',
        model: 'gpt-3.5-turbo-16k',
        key: 'WEBRAFT_API_KEY'
    });
    */

    for (let api of gpt4APIs) {
        try {
            response = await axios.post(api.url, {
                model: api.model,
                messages: options.disableFunctions ? messages : [
                    {
                        role: 'system',
                        content: `YOU HAVE TO RESPOND WITH THIS JSON FORMAT: {"message": "YOUR_MESSAGE", "function_call": {"name": "FUNCTION_NAME", "parameters": "FUNCTION_PARAMETERS"}}\nYou don't have to use a function, you can just leave the function_call empty. Example: {"message": "Hello"}\nExample usage with a function: {"message": "Hello", "function_call": {"name": "fetch_channels", "parameters": "{numberParam: 435, stringParam: "hello", booleanParam: true}"}\n\nYou can use these functions:\nfetch_channels()\nFetches all channels in the server.\n\nfetch_roles()\nFetches all roles in the server.\n\nfetch_emojis()\nFetches all emojis in the server.\n\nfetch_pins()\nFetches all pins in the server.\n\nweb_search(query: string)\n- query (REQUIRED): Query to search on Google.\nSearch Google and return top 10 results\n\nai_tools(limit: number, search: string)\n- limit (OPTIONAL): Limit of the results.\n- search (REQUIRED): Query to search AI tools.\nSearches AI tools\n\nreact_message(emoji: string)\n- emoji (REQUIRED): The emoji id or unicode emoji to react. Example: 1234567890 or 😂\nReacts to the message with an emoji\n\nmember_mention(name: string)\n- name (REQUIRED): Name of the member to search.\nSearches members in the server and shows their mention.\n\nsend_dm(message: string, send_files: boolean)\n- message (REQUIRED): The message content to send.\n- send_files (OPTIONAL): Whether the collected files (for example drawen images) will be sent along with the nessage. Default: false\nSends direct message to the user. Please do not spam.\n\nread_file(type: string, url: string)\n- type (REQUIRED): Can only be "image" or "text". If the extension is .png or .jpg, you should use "image". If the extension is .txt or .json, you should use "text".\n- url (REQUIRED): The url of the file to read.\nReads a file from the message attachments. You can only read .png, .jpg, .txt and .json files. You can use this function to see the sent files.${options?.tier1 ? `\n\nsave_memory(memory: string, duration: number)\n- memory (REQUIRED): The memory to save.\n- duration (OPTIONAL): The duration of the memory in days. (1-3) Default: 1\nSaves a memory. You will NOT use this for simple things. You will only use this function for necessary things that you don't want to forget. Example: "I'm now friends with user 329671025312923648", "I had a fight with user 751092600890458203"` : ''}${options?.tier3 ? `\n\nsummarize_page(url: string, question: string)\n- url (REQUIRED): The url of the web page to summarize.\n- question (OPTIONAL): The question to ask about the web page. Don't use this parameter if you want to summarize the web page.\nSummarizes a web page. You can use this function to find some information about a web page.` : ''}`
                    }
                ].concat(messages).concat([
                    {
                        role: 'system',
                        content: 'YOU HAVE TO RESPOND WITH THIS JSON FORMAT: {"message": "YOUR_MESSAGE", "function_call": {"name": "FUNCTION_NAME", "parameters": "FUNCTION_PARAMETERS"}}\nYou don\'t have to use a function, you can just leave the function_call empty. Example: {"message": "Hello"}'
                    }
                ])
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env[api.key]}`
                },
                timeout: 30000
            });
        } catch (error) {
            console.log('Error', api.url, error?.response ?? error);

            continue;
        };

        if (response.data?.choices && !['Internal Server Error', 'GPT-4 is down or your context is over 7100.'].includes(response.data?.choices?.[0]?.message?.content)) {
            console.log('Used API', api.url, 'with model', api.model, '-', response.data.choices[0].message.content);

            try {
                return options.disableFunctions ? response.data.choices[0].message.content : JSON.parse(response.data.choices[0].message.content.match(/^{.*}$/gm)[0]);
            } catch (error) {
                return null;
            };
        } else {
            console.log('Invalid response', api.url, api.model, response.data);

            continue;
        };
    };

    return null;
};

module.exports.vicuna = async (messages, options) => {
    let response;

    try {
        response = await axios.post('https://api.mandrillai.tech/v2/chat/completions', {
            model: 'vicuna-13b-v1.5-16k',
            messages: options.disableFunctions ? messages : [
                {
                    role: 'system',
                    content: `YOU HAVE TO RESPOND WITH THIS JSON FORMAT: {"message": "YOUR_MESSAGE", "function_call": {"name": "FUNCTION_NAME", "parameters": "FUNCTION_PARAMETERS"}}\nYou don't have to use a function, you can just leave the function_call empty. Example: {"message": "Hello"}\nExample usage with a function: {"message": "Hello", "function_call": {"name": "fetch_channels", "parameters": "{numberParam: 435, stringParam: "hello", booleanParam: true}"}\n\nYou can use these functions:\nfetch_channels()\nFetches all channels in the server.\n\nfetch_roles()\nFetches all roles in the server.\n\nfetch_emojis()\nFetches all emojis in the server.\n\nfetch_pins()\nFetches all pins in the server.\n\nweb_search(query: string)\n- query (REQUIRED): Query to search on Google.\nSearch Google and return top 10 results\n\nai_tools(limit: number, search: string)\n- limit (OPTIONAL): Limit of the results.\n- search (REQUIRED): Query to search AI tools.\nSearches AI tools\n\nreact_message(emoji: string)\n- emoji (REQUIRED): The emoji id or unicode emoji to react. Example: 1234567890 or 😂\nReacts to the message with an emoji\n\nmember_mention(name: string)\n- name (REQUIRED): Name of the member to search.\nSearches members in the server and shows their mention.\n\nsend_dm(message: string, send_files: boolean)\n- message (REQUIRED): The message content to send.\n- send_files (OPTIONAL): Whether the collected files (for example drawen images) will be sent along with the nessage. Default: false\nSends direct message to the user. Please do not spam.\n\nread_file(type: string, url: string)\n- type (REQUIRED): Can only be "image" or "text". If the extension is .png or .jpg, you should use "image". If the extension is .txt or .json, you should use "text".\n- url (REQUIRED): The url of the file to read.\nReads a file from the message attachments. You can only read .png, .jpg, .txt and .json files. You can use this function to see the sent files.${options?.tier1 ? `\n\nsave_memory(memory: string, duration: number)\n- memory (REQUIRED): The memory to save.\n- duration (OPTIONAL): The duration of the memory in days. (1-3) Default: 1\nSaves a memory. You will NOT use this for simple things. You will only use this function for necessary things that you don't want to forget. Example: "I'm now friends with user 329671025312923648", "I had a fight with user 751092600890458203"` : ''}${options?.tier3 ? `\n\nsummarize_page(url: string, question: string)\n- url (REQUIRED): The url of the web page to summarize.\n- question (OPTIONAL): The question to ask about the web page. Don't use this parameter if you want to summarize the web page.\nSummarizes a web page. You can use this function to find some information about a web page.` : ''}`
                }
            ].concat(messages).concat([
                {
                    role: 'system',
                    content: 'YOU HAVE TO RESPOND WITH THIS JSON FORMAT: {"message": "YOUR_MESSAGE", "function_call": {"name": "FUNCTION_NAME", "parameters": "FUNCTION_PARAMETERS"}}\nYou don\'t have to use a function, you can just leave the function_call empty. Example: {"message": "Hello"}'
                }
            ])
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.MANDRILL_API_KEY}`
            },
            timeout: 30000
        });
    } catch (error) {
        console.log('Error', error?.response ?? error);

        return null;
    };

    if (response.data?.choices && response.data?.choices?.[0]?.message?.content !== '') {
        console.log('Used API', 'https://api.mandrillai.tech/v1/chat/completions', 'with model', 'mistral-7B-openorca', '-', response.data.choices[0].message.content);

        try {
            return options.disableFunctions ? response.data.choices[0].message.content : JSON.parse(response.data.choices[0].message.content.match(/^{.*}$/gm)[0]);
        } catch (error) {
            return null;
        };
    } else return null;
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

    return reply;
};

module.exports.tryChatCompletion = async (messages, options) => {
    let response = await this.gpt4(messages, options);

    if (!response) response = await this.vicuna(messages, options);

    return response;
};

module.exports.chatCompletion = async (messages, options) => {
    let end;
    let response;
    let reply;

    response = await this.tryChatCompletion(messages, options);

    while (!end) {
        if (response?.function_call?.name) {
            messages.push({
                role: 'assistant',
                content: JSON.stringify(response)
            });

            let functionResponse;

            try {
                let functionMessage = options?.functionMessages?.[response?.function_call?.name] ?? 'Calling function...';
                let functionMessageContent = response?.message ? `${response?.message} **(${functionMessage})**` : functionMessage;

                reply = await this.followUp(reply, options?.message, functionMessageContent);

                functionResponse = await options?.functions?.[response?.function_call?.name](JSON.parse(response?.function_call?.parameters), options);
            } catch (error) {
                console.log('Function call errored', response?.function_call?.parameters, error);

                functionResponse = 'Function call failed.';
            };

            messages.push({
                role: 'system',
                name: response?.function_call?.name ?? 'unknown_function',
                content: `Function response:\n\n${functionResponse}`
            });

            console.log('Last 2 messages', messages.slice(-2));

            response = await this.tryChatCompletion(messages, options);
        } else {
            end = true;

            break;
        };
    };

    if (response?.message || typeof response === 'string') return {
        response: response?.message ?? response,
        reply
    };
    else return null;
};