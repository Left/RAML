/**
 * Created by Vadim on 11/13/2015.
 */

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
            document.getElementById("person_created").innerHTML = "Added " + firstName + " " + secondName;
        }
    }

    document.getElementById("person_created").innerHTML = "Adding " + firstName + " " + secondName;

    http.send(JSON.stringify({
        "firstName": firstName,
        "lastName": secondName,
        "yearOfBirth": 1930 + (random % 85)
    }));

}

function listPersons() {
    document.getElementById("persons").innerHTML = "Loading ...";

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
    var http = new XMLHttpRequest();
    http.open("GET", "/person/" +
        (<HTMLInputElement>document.getElementById("personIdToDelete")).value, true);

    http.onreadystatechange = function() {//Call a function when the state changes.
        if(http.readyState == 4 && http.status == 200) {
            alert(http.responseText);
        }
    }

    http.send();
}