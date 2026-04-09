struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!(
        "The area of the rectangle is {} square pixels.",
        area(&rect1)
    );
    println!("Transaction status: {:?}", process_transaction(Some(100)));
}

fn area(rectangle: &Rectangle) -> u32 {
    rectangle.width * rectangle.height
}

#[derive(Debug)]
enum TransactionStatus {
    success,
    failure,
}

fn process_transaction(amount: Option<u32>) -> TransactionStatus {
    match amount {
        Some(value) if value > 0 => TransactionStatus::success,
        _ => TransactionStatus::failure,
    }
}