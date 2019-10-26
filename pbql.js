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
    let regex = dataType === 'телефон ' ? /\d{10}/ : /(\w|[а-яА-ЯЁё])+/;
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
    //  command отдельно проверять
    while ([command, 'и'].includes(request.slice(beginIndex, spaceIndex))) {
        let secondSpaceIndex = request.indexOf(' ', spaceIndex + 1);
        if (request.slice(spaceIndex + 1, secondSpaceIndex + 1).includes('телефон ')) {
            beginIndex = getNextDataAndIndex(request, data, secondSpaceIndex, 'телефон ');
        } else if (request.slice(spaceIndex, secondSpaceIndex + 1).includes('почту ')) {
            beginIndex = getNextDataAndIndex(request, data, secondSpaceIndex, 'почту ');
        } else {
            let charNumber = beginIndex + request.slice(beginIndex, spaceIndex).length + 2;
            syntaxError(requestCounter, charNumber);
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

function addNameIfQuery(name, query, result) {
    if (name.includes(query)) {
        result[name] = '';
    }
    for (let phone of phoneBook.get(name).phones) {
        if (phone.includes(query)) {
            result[name] = '';
        }
    }
    for (let email of phoneBook.get(name).emails) {
        if (email.includes(query)) {
            result[name] = '';
        }
    }
}

function getAllNamesWithQuery(query) {
    let result = {};
    for (let name of phoneBook.keys()) {
        addNameIfQuery(name, query, result);
    }

    return result;
}

function getQueryForFindData(requestPart, query, beginIndex) {
    if (requestPart.indexOf('где ') === 15) {
        if (requestPart.indexOf('есть ') === 19) {
            query = requestPart.slice('для контактов, где есть '.length);
        } else {
            syntaxError(requestCounter, beginIndex + 'для контактов, где '.length + 1);
        }
    } else {
        syntaxError(requestCounter, beginIndex + 'для контактов, '.length + 1);
    }

    return query;
}

function getNamesForFindData(requestPart, beginIndex) {
    let query = '';
    if (requestPart.indexOf('для ') === 0) {
        if (requestPart.indexOf('контактов, ') === 4) {
            query = getQueryForFindData(requestPart, query, beginIndex);
        } else {
            syntaxError(requestCounter, beginIndex + 'для '.length + 1);
        }
    } else {
        syntaxError(requestCounter, beginIndex + 1);
    }

    return getAllNamesWithQuery(query);
}

function addFindData(d, result, name) {
    if (d === 'имя') {
        result[name] += name + ';';
    }
    if (d === 'телефоны') {
        result[name] += phoneBook.get(name).phones.join(',') + ';';
    }
    if (d === 'почты') {
        result[name] += phoneBook.get(name).emails.join(',') + ';';
    }
}

function findData(names, data) {
    let result = {};
    for (let name of Object.keys(names)) {
        result[name] = '';
        for (let d of data) {
            addFindData(d, result, name);
        }
    }

    return result;
}

function resolveQueryFindData(request) {
    let beginIndex = 0;
    let data = [];
    let spaceIndex = request.indexOf(' ');
    //  Покажи отдельно проверять
    while (['Покажи', 'и'].includes(request.slice(beginIndex, spaceIndex))) {
        let secondSpaceIndex = request.indexOf(' ', spaceIndex + 1);
        if (request.slice(spaceIndex + 1, secondSpaceIndex + 1).includes('телефоны ')) {
            data.push('телефоны');
        } else if (request.slice(spaceIndex, secondSpaceIndex + 1).includes('почты ')) {
            data.push('почты');
        } else if (request.slice(spaceIndex, secondSpaceIndex + 1).includes('имя ')) {
            data.push('имя');
        } else {
            let charNumber = beginIndex + request.slice(beginIndex, spaceIndex).length + 2;
            syntaxError(requestCounter, charNumber);
        }
        beginIndex = secondSpaceIndex + 1;
        spaceIndex = request.indexOf(' ', beginIndex + 1);
    }
    let names = getNamesForFindData(request.slice(beginIndex), beginIndex);

    return findData(names, data);
}


function deleteContacts(request) {
    let query = '';
    if (request.slice('Удали контакты, '.length).includes('где ')) {
        if (request.slice('Удали контакты, где '.length).includes('есть ')) {
            query = request.slice('Удали контакты, где есть '.length);
        } else {
            syntaxError(requestCounter, 'Удали контакты, где '.length + 1);
        }
    } else {
        syntaxError(requestCounter, 'Удали контакты, '.length + 1);
    }
    let names = getAllNamesWithQuery(query);
    let keys = Object.keys(names);
    for (let i = 0; i < keys.length; i++) {
        let name = keys[i];
        deleteContact(name);
    }
}

module.exports = { phoneBook, run };

