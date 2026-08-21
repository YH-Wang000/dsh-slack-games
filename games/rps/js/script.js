// VARIABLES
const choices = [
    {
        id: 1,
        name: "石头",
        image: "./img/rock.png"
    },
    {
        id: 2,
        name: "布",
        image: "./img/paper.png"
    },
    {
        id: 3,
        name: "剪刀",
        image: "./img/scissors.png"
    }]


let playerPoints = document.querySelector(".playerPoints")
let computerPoints = document.querySelector(".computerPoints")
let playerChoiceImg = document.querySelector("#playerChoiceImg")
let playerChoiceTxt = document.querySelector("#playerChoiceTxt")
let computerChoiceImg = document.querySelector("#computerChoiceImg")
let computerChoiceTxt = document.querySelector("#computerChoiceTxt")
let buttons = document.querySelectorAll(".btn")
let points = [0, 0]
let randomNumber;
let paused = false;



// EVENT LISTENERS
buttons.forEach((button) => {
    button.addEventListener("click", () => {
        if (paused) return;
        if (button.textContent === "石头") {
            playerChoiceImg.src = choices[0].image;
            playerChoiceTxt.textContent = choices[0].name;
        } else if (button.textContent === "布") {
            playerChoiceImg.src = choices[1].image;
            playerChoiceTxt.textContent = choices[1].name;
        } else if (button.textContent === "剪刀") {
            playerChoiceImg.src = choices[2].image;
            playerChoiceTxt.textContent = choices[2].name;
        }
        getComputerChoice();
        console.log(points);
    })
})


// FUNCTIONS
function getComputerChoice() {
    computerChoiceImg.src = "./img/gif.gif"
    setTimeout(() => {
        randomNumber = Math.floor(Math.random() * 3);
        computerChoiceImg.src = choices[randomNumber].image;
        computerChoiceTxt.textContent = choices[randomNumber].name;
        gameRules();
        playerPoints.textContent = points[0];
        computerPoints.textContent = points[1];
        postState && postState();
        whoWon();
    }, 1000);
}

function gameRules() {
    if (playerChoiceTxt.textContent === choices[0].name && computerChoiceTxt.textContent === choices[1].name) {
        points[1]++;
    } else if (playerChoiceTxt.textContent === choices[1].name && computerChoiceTxt.textContent === choices[2].name) {
        points[1]++;
    } else if (playerChoiceTxt.textContent === choices[2].name && computerChoiceTxt.textContent === choices[0].name) {
        points[1]++;
    } else if (playerChoiceTxt.textContent === computerChoiceTxt.textContent) {
        console.log("draw");
    } else {
        points[0]++;
    }
}

function whoWon() {
    var res = document.getElementById("result");
    if (points[0] === 10) {
        if (res) res.textContent = "🎉 你干掉了 AI，取得胜利！";
        setTimeout(function () { points = [0, 0]; updatePoints(); postState && postState(); }, 1600);
    } else if (points[1] === 10) {
        if (res) res.textContent = "🤖 你被人工智能打败了！";
        setTimeout(function () { points = [0, 0]; updatePoints(); postState && postState(); }, 1600);
    }
}
function updatePoints() {
    playerPoints.textContent = points[0];
    computerPoints.textContent = points[1];
}