fn main() {
    let mut x = 5;
    println!("The value of x is: {x}");
    x = 1;
    println!("The value of x is: {x}");
    another_function();
    println!("The value of five is: {}", five());

    while_loop();
    for_loop();
    loop_loop();
}


fn another_function() {
    println!("The value of x is: 1");
}
fn five() -> i8 {
    5 * 5
}

//Control flows

fn while_loop() {
    let mut number = 3;

    while number != 0 {
        println!("{number}!");

        number -= 1;
    }

    println!("LIFTOFF!!!");
}

fn for_loop() {
    let a = [10, 20, 30, 40, 50];

    for element in a {
        println!("the value is: {element}");
    }
}

fn loop_loop() {
    let mut count = 0;

    'counting_up: loop {
        println!("count = {count}");
        let mut remaining = 10;

        loop {
            println!("remaining = {remaining}");
            if remaining == 9 {
                break;
            }
            if count == 2 {
                break 'counting_up;
            }
            remaining -= 1;
        }

        count += 1;
    }
    println!("End count = {count}");
}