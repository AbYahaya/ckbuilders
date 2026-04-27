#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);
#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

use ckb_std::ckb_constants::Source;
use ckb_std::error::SysError;
use ckb_std::high_level::{load_cell, load_cell_data, QueryIter};

#[repr(i8)]
enum Error {
    IndexOutOfBound = 1,
    InvalidTransactionStructure = 2,
    InvalidCounterDataLength = 3,
    InvalidCounterValue = 4,
}

impl From<SysError> for Error {
    fn from(err: SysError) -> Self {
        match err {
            SysError::IndexOutOfBound => Self::IndexOutOfBound,
            SysError::ItemMissing => Self::IndexOutOfBound,
            SysError::LengthNotEnough(_) => Self::IndexOutOfBound,
            SysError::Encoding => Self::IndexOutOfBound,
            SysError::Unknown(code) => panic!("unexpected sys error {}", code),
            _ => Self::IndexOutOfBound,
        }
    }
}

fn parse_u64_le(data: &[u8]) -> Result<u64, Error> {
    if data.len() < 8 {
        return Err(Error::InvalidCounterDataLength);
    }
    let mut buf = [0u8; 8];
    buf.copy_from_slice(&data[0..8]);
    Ok(u64::from_le_bytes(buf))
}

fn run() -> Result<(), Error> {
    let group_input_count = QueryIter::new(load_cell, Source::GroupInput).count();
    let group_output_count = QueryIter::new(load_cell, Source::GroupOutput).count();

    // Mint: allow creating a new counter cell when there is no counter input.
    if group_input_count == 0 {
        if group_output_count != 1 {
            return Err(Error::InvalidTransactionStructure);
        }

        let output_data = load_cell_data(0, Source::GroupOutput)?;
        let output_value = parse_u64_le(&output_data)?;
        if output_value != 0 {
            return Err(Error::InvalidCounterValue);
        }

        return Ok(());
    }

    // Update: enforce strict 1 -> 1 state transition.
    if group_input_count != 1 || group_output_count != 1 {
        return Err(Error::InvalidTransactionStructure);
    }

    let input_data = load_cell_data(0, Source::GroupInput)?;
    let output_data = load_cell_data(0, Source::GroupOutput)?;

    let input_value = parse_u64_le(&input_data)?;
    let output_value = parse_u64_le(&output_data)?;

    if input_value + 1 != output_value {
        return Err(Error::InvalidCounterValue);
    }

    Ok(())
}

pub fn program_entry() -> i8 {
    match run() {
        Ok(()) => 0,
        Err(err) => err as i8,
    }
}
