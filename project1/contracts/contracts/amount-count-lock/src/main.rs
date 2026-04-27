#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);
#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

use alloc::vec::Vec;

use ckb_std::ckb_constants::Source;
use ckb_std::ckb_types::{bytes::Bytes, packed::CellOutput, prelude::*};
use ckb_std::error::SysError;
use ckb_std::high_level::{load_cell, load_script, QueryIter};

const ARGS_LEN: usize = 16;

#[repr(i8)]
enum Error {
    IndexOutOfBound = 1,
    InvalidArgsLen = 2,
    Unauthorized = 3,
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

fn read_u64_le(raw: &[u8]) -> u64 {
    let mut buf = [0u8; 8];
    buf.copy_from_slice(raw);
    u64::from_le_bytes(buf)
}

fn run() -> Result<(), Error> {
    let script = load_script()?;
    let args: Bytes = script.args().unpack();
    if args.len() != ARGS_LEN {
        return Err(Error::InvalidArgsLen);
    }

    let amount = read_u64_le(&args[0..8]);
    let count = read_u64_le(&args[8..16]);

    let mut found: u64 = 0;
    let output_cells: Vec<CellOutput> = QueryIter::new(load_cell, Source::Output).collect();
    for cell in output_cells.iter() {
        let cell_capacity: u64 = cell.capacity().unpack();
        if cell_capacity == amount {
            found += 1;
            if found >= count {
                return Ok(());
            }
        }
    }

    Err(Error::Unauthorized)
}

pub fn program_entry() -> i8 {
    match run() {
        Ok(()) => 0,
        Err(err) => err as i8,
    }
}
