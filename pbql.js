'use strict';

/**
 * Телефонная книга
 */
const phoneBook = new Map();
let requestCounter = 0;

/**
 * Вызывайте эту функцию, если есть синтаксическая ошибка в запросе
 * @param {number} lineNumber – номер строки с ошибкой
 * @param {number} charNumber – номер символа, с которого запрос стал ошибочным
 */
function syntaxError(lineNumber, charNumber) {
    throw new Error(`SyntaxError: Unexpected token at ${lineNumber}:${charNumber}`);
}

/**
 * Выполнение запроса на языке pbQL
 * @param {string} query
 * @returns {string[]} - строки с результатами запроса
 */
function run(query) {
    requestCounter = 0;
    let result = [];
    if (query[query.length - 1] !== ';') {
        syntaxError(1, query.length + 1);
    }

    let splittedQuery = query.split(';');
    splittedQuery.pop();
    for (let request of splittedQuery) {
        requestCounter++;
        let someData = resolveRequest(request);
        let keys = Object.keys(someData);
        for (let i = 0; i < keys.length; i++) {
            result = result.concat(someData[keys[i]].slice(0, someData[keys[i]].length - 1));
        }
    }

    return result;
}


function resolveRequest(request) {
    let someData = {};
    let commandEnd = request.indexOf(' ');
    switch (request.slice(0, commandEnd)) {
        case ('Создай') :
            createContact(request);
            break;
        case ('Удали') :
            resolveQueryDeleteData(request);
            break;
        case ('Добавь') :
            resolveRequestChangeData(request, addContactData);
            break;
        case ('Покажи') :
            someData = resolveQueryFindData(request);
            break;
        default:
            syntaxError(requestCounter, 1);
            break;
    }

    return someData;
}

function createContact(request) {
    let nameStartIndex = request.indexOf(' ', request.indexOf(' ') + 1) + 1;
    if (!request.slice(0, nameStartIndex).includes('Создай контакт ')) {
        syntaxError(requestCounter, 'Создай '.length + 1);
    }
    let name = request.slice(nameStartIndex);
    if (!phoneBook.has(name)) {
        phoneBook.set(name, {});
        phoneBook.get(name).phones = [];
        phoneBook.get(name).emails = [];
    }
}

function deleteContact(name) {
    if (phoneBook.has(name)) {
        phoneBook.delete(name);
    }
}

function addContactData(name, dataType, data) {
    if (phoneBook.has(name)) {
        if (!phoneBook.get(name)[dataType].includes(data)) {
            phoneBook.get(name)[dataType].push(data);
        }
    }
}

function deleteContactData(name, dataType, data) {
    if (phoneBook.has(name)) {
        if (phoneBook.get(name)[dataType].includes(data)) {
            phoneBook.get(name)[dataType].splice(phoneBook.get(name)[dataType].indexOf(data), 1);
        }
    }
}

function formatPhoneNumber(phone) {
    let res = '+7 ';
    res += `(${phone.slice(0, 3)}) `;
    res += `${phone.slice(3, 6)}-${phone.slice(6, 8)}-${phone.slice(8, 10)}`;

    return res;
}

function changeData(requestPart, func, name, beginIndex) {
    if (requestPart[1] === 'телефон') {
        if (requestPart[2].search(/\d{10}/) === -1) {
            syntaxError(requestCounter, beginIndex + requestPart[1].length + 1);
        }
        func(name, 'phones', formatPhoneNumber(requestPart[2]));
    } else if (requestPart[1] === 'почту') {
        if (requestPart[2].search(/\w+@\w+\.\w+/) === -1) {
            syntaxError(requestCounter, beginIndex + requestPart[1].length + 1);
        }
        func(name, 'emails', requestPart[2]);
    } else {
        syntaxError(requestCounter, beginIndex);
    }
}

function resolveRequestChangeData(request, func) {
    let nameStart = request.indexOf('для контакта ') + 'для контакта '.length;
    let name = request.slice(nameStart);
    let beginIndex = 0;
    let endIndex = request.indexOf(' ', request.indexOf(' ', request.indexOf(' ') + 1) + 1) + 1;
    while (!request.slice(beginIndex, beginIndex + 13).includes('для контакта')) {
        let requestPart = request.slice(beginIndex, endIndex).split(' ');
        if (['Добавь', 'Удали', 'и'].includes(requestPart[0])) {
            changeData(requestPart, func, name, beginIndex + requestPart[0].length + 2);
        } else {
            syntaxError(requestCounter, beginIndex + 1);
        }
        beginIndex = endIndex;
        let secondSpaceIndex = request.indexOf(' ', request.indexOf(' ', endIndex) + 1);
        endIndex = request.indexOf(' ', secondSpaceIndex + 1) + 1;
    }
}

function resolveQueryDeleteData(request) {
    let name = '';
    let commandEnd = request.indexOf(' ', request.indexOf(' ') + 1);
    switch (request.slice(request.indexOf(' ') + 1, commandEnd)) {
        case ('контакт') :
            name += request.slice('Удали контакт '.length);
            deleteContact(name);
            break;
        case ('телефон') :
            resolveRequestChangeData(request, deleteContactData);
            break;
        case ('почту') :
            resolveRequestChangeData(request, deleteContactData);
            break;
        case ('контакты,') :
            deleteContacts(request);
            break;
        default:
            syntaxError(requestCounter, 'Удали '.length + 1);
            break;

    }
}


function findData(requestPart, result, name, beginIndex) {
    if (['Покажи', 'и'].includes(requestPart[0])) {
        switch (requestPart[1]) {
            case ('имя'):
                result[name] += name + ';';
                break;
            case ('телефоны'):
                result[name] += phoneBook.get(name).phones.join(',') + ';';
                break;
            case ('почты'):
                result[name] += phoneBook.get(name).emails.join(',') + ';';
                break;
            default:
                syntaxError(requestCounter, beginIndex + 2 + requestPart[0].length);
                break;

        }
    } else {
        syntaxError(requestCounter, beginIndex + 2);
    }
}

function getAllNamesWithQuery(query) {
    let result = {};
    for (let name of phoneBook.keys()) {
        if (name.indexOf(query) !== -1) {
            result[name] = '';
        }
    }

    return result;
}

function resolveQueryFindData(request) {
    let queryStart = request.indexOf(', где есть') + ', где есть '.length;
    if (request.slice(0, queryStart + 1).includes('  ')) {
        syntaxError(requestCounter, request.indexOf('  ') + 2);
    }
    let result = getAllNamesWithQuery(request.slice(queryStart, request.length));
    let beginIndex = 0;
    let endIndex = request.indexOf(' ', request.indexOf(' ') + 1) + 1;
    let keys = Object.keys(result);
    while (!request.slice(beginIndex, beginIndex + 3).includes('для')) {
        for (let i = 0; i < keys.length; i++) {
            let name = keys[i];
            let requestPart = request.slice(beginIndex, endIndex).split(' ');
            findData(requestPart, result, name, beginIndex);
        }
        beginIndex = endIndex;
        endIndex = request.indexOf(' ', request.indexOf(' ', endIndex) + 1) + 1;
    }

    return result;
}

function deleteContacts(request) {
    let queryStart = request.indexOf('есть') + 'есть '.length;
    let query = request.slice(queryStart, request.length);
    let names = getAllNamesWithQuery(query);
    let keys = Object.keys(names);
    for (let i = 0; i < keys.length; i++) {
        let name = keys[i];
        deleteContact(name);
    }
}

module.exports = { phoneBook, run };

