/*symbol = totalmente unico*/
globalA = 10;

function exemplo() {
    debugger;
    //console.log(localA);

    var localA = 10;
    let localB = 20;
    const localC = 30;

    console.log(localA);
    console.log(localA);
    console.log(localA);
    console.log(globalA);

    globalB = 30;

    if (true) {
        var localX = "var";
        let blocoY = "let";
        const blocoZ = "blocoZ";

        console.log(`Dentro do IF: ${localX}`);
        console.log(`Dentro do IF: ${blocoY}`);
        console.log(`Dentro do IF: ${blocoZ}`);
    }

    console.log(`Fora do IF: ${localX}`)
    //console.log(`Fora do IF: ${blocoY}`)

    const divA = document.all.A;
    const divB = document.all.B;

    divA.innerText = "Aula de Web";
    divB.innerHTML = `<h1>oi</h1>`;
    

    console.log(divA);

}

exemplo();