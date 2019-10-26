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

    let splittedQuery = query.split(';');
    for (let request of splittedQuery.slice(0, splittedQuery.length - 1)) {
        requestCounter++;
        let someData = resolveRequest(request);
        let keys = Object.keys(someData);
        for (let i = 0; i < keys.length; i++) {
            result = result.concat(someData[keys[i]].slice(0, someData[keys[i]].length - 1));
        }
    }
    if (query[query.length - 1] !== ';') {
        syntaxError(requestCounter + 1, splittedQuery[requestCounter].length + 1);
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
            resolveRequestChangeData(request, 'Добавь', addContactData);
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

function getNameForChangeData(requestPart, beginIndex) {
    let name = '';
    if (requestPart.indexOf('для ') === 0) {
        if (requestPart.indexOf('контакта ') === 4) {
            name = requestPart.slice('для контакта '.length);
        } else {
            syntaxError(requestCounter, beginIndex + 'для '.length + 1);
        }
    } else {
        syntaxError(requestCounter, beginIndex + 1);
    }

    return name;
}

function changeData(data, func, name) {
    for (let d of data) {
        let spData = d.split(' ');
        if (spData[0] === 'phones') {
            func(name, spData[0], formatPhoneNumber(spData[1]));
        } else {
            func(name, spData[0], spData[1]);
        }
    }
}

function getNextDataAndIndex(request, data, secondSpaceIndex, dataType) {
    let dataTypeEng = dataType === 'телефон ' ? 'phones' : 'emails';
    let regex = dataType === 'телефон ' ? /\d{10}/ : /\w+@\w+\.\w+/;
    let thirdSpaceIndex = request.indexOf(' ', secondSpaceIndex + 1);
    let dataToChange = request.slice(secondSpaceIndex + 1, thirdSpaceIndex);
    if (dataToChange.search(regex) !== -1) {
        data.push(`${dataTypeEng} ${dataToChange}`);
    } else {
        syntaxError(requestCounter, secondSpaceIndex + 2);
    }

    return thirdSpaceIndex + 1;
}

function resolveRequestChangeData(request, command, func) {
    let beginIndex = 0;
    let data = [];
    let spaceIndex = request.indexOf(' ');
    while ([command, 'и'].includes(request.slice(beginIndex, spaceIndex))) {
        let secondSpaceIndex = request.indexOf(' ', spaceIndex + 1);
        let commandLength = command.length + 1;
        if (request.slice(spaceIndex + 1, secondSpaceIndex + 1).includes('телефон ')) {
            beginIndex = getNextDataAndIndex(request, data, secondSpaceIndex, 'телефон ');
        } else if (request.slice(spaceIndex, secondSpaceIndex + 1).includes('почту ')) {
            beginIndex = getNextDataAndIndex(request, data, secondSpaceIndex, 'почту ');
        } else {
            syntaxError(requestCounter, commandLength + 1);
        }
        spaceIndex = request.indexOf(' ', beginIndex + 1);
    }
    let name = getNameForChangeData(request.slice(beginIndex), beginIndex);
    changeData(data, func, name);
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
            resolveRequestChangeData(request, 'Удали', deleteContactData);
            break;
        case ('почту') :
            resolveRequestChangeData(request, 'Удали', deleteContactData);
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

