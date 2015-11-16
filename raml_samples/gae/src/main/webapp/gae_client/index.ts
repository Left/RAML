var reportProgress = function (innerHTML) {
    document.getElementById("person_created").innerHTML = innerHTML;
};

var getIdFromInputFld = function () {
    return (<HTMLInputElement>document.getElementById("personIdToDelete")).value;
};

function createPerson() {
    var firstNames = ["Manie", "Joya", "Carroll", "Vivien", "Daphne", "Shala", "Shaunta", "Hershel", "Lillian", "Lonnie", "Chester", "Grayce", "Ching", "Chante", "Mayra", "Pasty", "Shayna", "Willow", "Mable", "Chastity", "Genaro", "Marcela", "Rasheeda", "Mittie", "Clifford", "Jolie"];
    var secondNames = ["Couture", "Swanigan", "Hahne", "Oliveras", "Applewhite", "Merchant", "Lariviere", "Saez", "Feldt", "Shaw", "Valois", "Busse", "Coco", "Finks", "Logue", "Townsel", "Almeda", "Barfield", "Bax", "Jahns"];
    var random = (new Date()).getTime();
    const firstName = firstNames[random * random % firstNames.length];
    const secondName = secondNames[random * random % secondNames.length];

    var http = new XMLHttpRequest();
    var url = "/person";
    http.open("POST", url, true);

    http.setRequestHeader("Content-type", "application/json");

    http.onreadystatechange = function() {//Call a function when the state changes.
        if(http.readyState == 4 && http.status == 200) {
            reportProgress("Added " + firstName + " " + secondName);
        }
    }

    reportProgress("Adding " + firstName + " " + secondName);

    http.send(JSON.stringify({
        "firstName": firstName,
        "lastName": secondName,
        "yearOfBirth": 1930 + (random % 85)
    }));

}

function listPersons() {
    reportProgress("Loading persons list...");

    var http = new XMLHttpRequest();
    http.open("GET", "/person", true);

    http.onreadystatechange = function() {//Call a function when the state changes.
        if(http.readyState == 4 && http.status == 200) {
            document.getElementById("persons").innerHTML = http.responseText;
        }
    }

    http.send();
}

function deletePerson() {
    reportProgress("Deleting person with id " + getIdFromInputFld() + " ...");

    var http = new XMLHttpRequest();
    http.open("DELETE", "/person/" + getIdFromInputFld(), true);

    http.onreadystatechange = function() {//Call a function when the state changes.
        if(http.readyState == 4 && http.status == 200) {
            // re-read
            var person = JSON.parse(http.responseText);
            reportProgress("Deleted " + person.firstName + " " + person.lastName);
        }
    };

    http.send();
}

function getPerson() {
    reportProgress("Reading person with id " + getIdFromInputFld() + " ...");

    var http = new XMLHttpRequest();
    http.open("GET", "/person/" +
        (<HTMLInputElement>document.getElementById("personIdToDelete")).value, true);

    http.onreadystatechange = function() {//Call a function when the state changes.
        if(http.readyState == 4 && http.status == 200) {
            // re-read
            var person = JSON.parse(http.responseText);
            reportProgress("Read " + person.firstName + " " + person.lastName +
                (person.yearOfBirth ? (", (s)he is " + ((new Date()).getFullYear() - person.yearOfBirth) + " years old") : ""));
        }
    }

    http.send();
}


