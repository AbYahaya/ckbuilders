fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone();

    println!("s1 = {s1}, s2 = {s2}");

    let mut s = String::from("hello");
    change(&mut s);
    println!("s = {s}");
    let s1 = String::from("hello");
    println!("The length of '{}' is {}.", s1, borrow(&s1));

}
//Using a reference to avoid taking ownership of the value
fn change(some_string: &mut String) {
    some_string.push_str(", world");
}

fn borrow(val: &String) -> i8 {
    let s = val.len() as i8;
    s
}