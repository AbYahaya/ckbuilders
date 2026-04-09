fn main() {
    let mut x = 5;
    println!("The value of x is: {x}");
    x = 1;
    println!("The value of x is: {x}");
    another_function();
    println!("The value of five is: {}", five());
}


fn another_function() {
    println!("The value of x is: 1");
}
fn five() -> i8 {
    5 * 5
}