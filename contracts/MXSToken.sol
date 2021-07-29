pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/v2-core/contracts/interfaces/IERC20.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';

contract MXSToken is Context, IERC20, Ownable {
    using SafeMath for uint256;
    using Address for address;

    mapping (address => uint256) private _rOwned;
    mapping (address => uint256) private _tOwned;
    mapping (address => mapping (address => uint256)) private _allowances;

    mapping (address => bool) private _isExcludedFromFee;

    mapping (address => bool) private _isExcludedFromReward;
    
    mapping (address => bool) private _isExcludedFromBlockLimit;

    address[] private _excluded;
  
    uint256 private constant MAX = ~uint256(0);
    uint256 private _tTotal = 1000000000 * 10 ** 18;
    uint256 private _rTotal = (MAX - (MAX % _tTotal));
    uint256 private _tFeeTotal;
    uint256 private _tCommunityTotal;

    string private _name = "Matrix Samurai";
    string private _symbol = "MXS";
    uint8 private _decimals = 18;


    uint256 public _taxFee = 6;
    uint256 private _previousTaxFee = _taxFee;
      
    uint256 public _communityFee = 3;
    uint256 private _previousCommunityFee = _communityFee;

    uint256 public _maxTxAmount = 1000000 * 10 ** 18;

    address public communityAddress = 0xdD870fA1b7C4700F2BD7f44238821C26f7392148;
    
    mapping(address => uint256) lastBlockTransfer;
    
    IUniswapV2Router02 public uniswapV2Router;
    address public uniswapV2Pair;

    uint256 private tradingStartTime;
    address[] private canTransferBeforeTradingIsEnabled;
   
    constructor (address uniswapRouter) public {
        _rOwned[_msgSender()] = _rTotal;
       
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(uniswapRouter);
        uniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory()).createPair(address(this), _uniswapV2Router.WETH());
        uniswapV2Router = _uniswapV2Router;
        
        _isExcludedFromFee[owner()] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromFee[communityAddress] = true;
        
        _isExcludedFromReward[uniswapV2Pair] = true;
        
        _isExcludedFromBlockLimit[owner()] = true;
        _isExcludedFromBlockLimit[uniswapV2Pair] = true;
        _isExcludedFromBlockLimit[address(uniswapV2Router)] = true;
        _isExcludedFromBlockLimit[communityAddress] = true;

        canTransferBeforeTradingIsEnabled[owner()] = true;
        
        emit Transfer(address(0), _msgSender(), _tTotal);
    }

    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view override returns (uint256) {
        return _tTotal;
    }

    function balanceOf(address account) public view override returns (uint256) {
        if (_isExcludedFromReward[account]) return _tOwned[account];
        return tokenFromReflection(_rOwned[account]);
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    function isExcludedFromReward(address account) public view returns (bool) {
        return _isExcludedFromReward[account];
    }

    function totalFees() public view returns (uint256) {
        return _tFeeTotal;
    }
      
    function totalCommunityRewards() public view returns (uint256) {
        return _tCommunityTotal;
    }

    function deliver(uint256 tAmount) public {
        address sender = _msgSender();
        require(!_isExcludedFromReward[sender], "Excluded addresses cannot call this function");
        (uint256 rAmount,,,,,) = _getValues(tAmount);
        _rOwned[sender] = _rOwned[sender].sub(rAmount);
        _rTotal = _rTotal.sub(rAmount);
        _tFeeTotal = _tFeeTotal.add(tAmount);
    }
 
    function reflectionFromToken(uint256 tAmount, bool deductTransferFee) public view returns(uint256) {
        require(tAmount <= _tTotal, "Amount must be less than supply");
        if (!deductTransferFee) {
            (uint256 rAmount,,,,,) = _getValues(tAmount);
            return rAmount;
        } else {
            (,uint256 rTransferAmount,,,,) = _getValues(tAmount);
            return rTransferAmount;
        }
    }

    function tokenFromReflection(uint256 rAmount) public view returns(uint256) {
        require(rAmount <= _rTotal, "Amount must be less than total reflections");
        uint256 currentRate =  _getRate();
        return rAmount.div(currentRate);
    }

    function excludeFromReward(address account) public onlyOwner() {
        require(!_isExcludedFromReward[account], "Account is already excluded");
        if(_rOwned[account] > 0) {
            _tOwned[account] = tokenFromReflection(_rOwned[account]);
        }
        _isExcludedFromReward[account] = true;
        _excluded.push(account);
    }

    function includeInReward(address account) external onlyOwner() {
        require(_isExcludedFromReward[account], "Account is already excluded");
        for (uint256 i = 0; i < _excluded.length; i++) {
            if (_excluded[i] == account) {
                _excluded[i] = _excluded[_excluded.length - 1];
                _tOwned[account] = 0;
                _isExcludedFromReward[account] = false;
                _excluded.pop();
                break;
            }
        }
    }

    function _approve(address owner, address spender, uint256 amount) private {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) private {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");

        // address must be permitted to transfer before tradingStartTime
        if(tradingStartTime > block.timestamp) {
            require(canTransferBeforeTradingIsEnabled[from], "This account cannot send tokens until trading is enabled");
        }

        if (from != owner() && to != owner()) {
            require(amount <= _maxTxAmount, "Transfer amount exceeds the maxTxAmount.");
        }
        
        // if (!_isExcludedFromBlockLimit[to]) {
        //     require(block.number > lastBlockTransfer[to], "One transfer per block");
        //     lastBlockTransfer[to] = block.number;
        // }
        
        // if (!_isExcludedFromBlockLimit[from]) {
        //     require(block.number > lastBlockTransfer[from], "One transfer per block");
        //     lastBlockTransfer[from] = block.number;
        // }
        
        bool takeFee = true;
        
        // if any account belongs to _isExcludedFromFee account then remove the fee
        // do not take fee if wallet to wallet transfer ( to / from uniswap)
        if ((_isExcludedFromFee[from] || _isExcludedFromFee[to]) || (to != uniswapV2Pair && from != uniswapV2Pair)) {
            takeFee = false;
        }
       
        _tokenTransfer(from,to,amount,takeFee);
    }

    function _tokenTransfer(address sender, address recipient, uint256 amount,bool takeFee) private {
        if(!takeFee)
            removeAllFee();
       
        if (_isExcludedFromReward[sender] && !_isExcludedFromReward[recipient]) {
            _transferFromExcluded(sender, recipient, amount);
        } else if (!_isExcludedFromReward[sender] && _isExcludedFromReward[recipient]) {
            _transferToExcluded(sender, recipient, amount);
        } else if (!_isExcludedFromReward[sender] && !_isExcludedFromReward[recipient]) {
            _transferStandard(sender, recipient, amount);
        } else if (_isExcludedFromReward[sender] && _isExcludedFromReward[recipient]) {
            _transferBothExcluded(sender, recipient, amount);
        } else {
            _transferStandard(sender, recipient, amount);
        }
       
        if(!takeFee)
            restoreAllFee();
    }

    function _transferStandard(address sender, address recipient, uint256 tAmount) private {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tCommunity) = _getValues(tAmount);
        _rOwned[sender] = _rOwned[sender].sub(rAmount);
        _rOwned[recipient] = _rOwned[recipient].add(rTransferAmount);
        _takeCommunity(tCommunity);
        _reflectFee(rFee, tFee);
        emit Transfer(sender, recipient, tTransferAmount);
    }

    function _transferToExcluded(address sender, address recipient, uint256 tAmount) private {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tCommunity) = _getValues(tAmount);
        _rOwned[sender] = _rOwned[sender].sub(rAmount);
        _tOwned[recipient] = _tOwned[recipient].add(tTransferAmount);
        _rOwned[recipient] = _rOwned[recipient].add(rTransferAmount);          
        _takeCommunity(tCommunity);
        _reflectFee(rFee, tFee);
        emit Transfer(sender, recipient, tTransferAmount);
    }

    function _transferFromExcluded(address sender, address recipient, uint256 tAmount) private {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tCommunity) = _getValues(tAmount);
        _tOwned[sender] = _tOwned[sender].sub(tAmount);
        _rOwned[sender] = _rOwned[sender].sub(rAmount);
        _rOwned[recipient] = _rOwned[recipient].add(rTransferAmount);  
        _takeCommunity(tCommunity);
        _reflectFee(rFee, tFee);
        emit Transfer(sender, recipient, tTransferAmount);
    }

    function _transferBothExcluded(address sender, address recipient, uint256 tAmount) private {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tCommunity) = _getValues(tAmount);
        _tOwned[sender] = _tOwned[sender].sub(tAmount);
        _rOwned[sender] = _rOwned[sender].sub(rAmount);
        _tOwned[recipient] = _tOwned[recipient].add(tTransferAmount);
        _rOwned[recipient] = _rOwned[recipient].add(rTransferAmount);       
        _takeCommunity(tCommunity);
        _reflectFee(rFee, tFee);
        emit Transfer(sender, recipient, tTransferAmount);
    }

    function _reflectFee(uint256 rFee, uint256 tFee) private {
        _rTotal = _rTotal.sub(rFee);
        _tFeeTotal = _tFeeTotal.add(tFee);
    }

    function _getValues(uint256 tAmount) private view returns (uint256, uint256, uint256, uint256, uint256, uint256) {
        (uint256 tTransferAmount, uint256 tFee, uint256 tCommunity) = _getTValues(tAmount);
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee) = _getRValues(tAmount, tFee, tCommunity, _getRate());
        return (rAmount, rTransferAmount, rFee, tTransferAmount, tFee, tCommunity);
    }

    function _getTValues(uint256 tAmount) private view returns (uint256, uint256, uint256) {
        uint256 tFee = calculateTaxFee(tAmount);
        uint256 tCommunity = calculateCommunityFee(tAmount);
        uint256 tTransferAmount = tAmount.sub(tFee).sub(tCommunity);
        return (tTransferAmount, tFee, tCommunity);
    }

    function _getRValues(uint256 tAmount, uint256 tFee, uint256 tCommunity, uint256 currentRate) private pure returns (uint256, uint256, uint256) {
        uint256 rAmount = tAmount.mul(currentRate);
        uint256 rFee = tFee.mul(currentRate);
        uint256 rCommunity = tCommunity.mul(currentRate);
        uint256 rTransferAmount = rAmount.sub(rFee).sub(rCommunity);
        return (rAmount, rTransferAmount, rFee);
    }

    function _getRate() private view returns(uint256) {
        (uint256 rSupply, uint256 tSupply) = _getCurrentSupply();
        return rSupply.div(tSupply);
    }

    function _getCurrentSupply() private view returns(uint256, uint256) {
        uint256 rSupply = _rTotal;
        uint256 tSupply = _tTotal;     
        for (uint256 i = 0; i < _excluded.length; i++) {
            if (_rOwned[_excluded[i]] > rSupply || _tOwned[_excluded[i]] > tSupply) return (_rTotal, _tTotal);
            rSupply = rSupply.sub(_rOwned[_excluded[i]]);
            tSupply = tSupply.sub(_tOwned[_excluded[i]]);
        }
        if (rSupply < _rTotal.div(_tTotal)) return (_rTotal, _tTotal);
        return (rSupply, tSupply);
    }
   
    function _takeCommunity(uint256 tCommunity) private {
        uint256 currentRate =  _getRate();
        uint256 rCommunity = tCommunity.mul(currentRate);
        _rOwned[communityAddress] = _rOwned[communityAddress].add(rCommunity);
        _tCommunityTotal = _tCommunityTotal.add(tCommunity);
        if(_isExcludedFromReward[communityAddress])
            _tOwned[communityAddress] = _tOwned[communityAddress].add(tCommunity);
    }

    function calculateTaxFee(uint256 _amount) private view returns (uint256) {
        return _amount.mul(_taxFee).div(100);
    }
      
    function calculateCommunityFee(uint256 _amount) private view returns (uint256) {
        return _amount.mul(_communityFee).div(100);
    }

    function removeAllFee() private {
        if(_taxFee == 0 && _communityFee == 0) return;
       
        _previousTaxFee = _taxFee;
        _previousCommunityFee = _communityFee;

        _taxFee = 0;
        _communityFee = 0;
    }
   
    function restoreAllFee() private {
        _taxFee = _previousTaxFee;
        _communityFee = _previousCommunityFee;
    }

    function isExcludedFromFee(address account) public view returns(bool) {
        return _isExcludedFromFee[account];
    }
   
    function excludeFromFee(address account) public onlyOwner {
        _isExcludedFromFee[account] = true;
    }
   
    function includeInFee(address account) public onlyOwner {
        _isExcludedFromFee[account] = false;
    }
    
    function isExcludedFromBlockLimit(address account) public view returns(bool) {
        return _isExcludedFromBlockLimit[account];
    }
   
    function excludeFromBlockLimit(address account) public onlyOwner {
        _isExcludedFromBlockLimit[account] = true;
    }
   
    function includeInBlockLimit(address account) public onlyOwner {
        _isExcludedFromBlockLimit[account] = false;
    }

    function setTaxFeePercent(uint256 taxFee) external onlyOwner() {
        _taxFee = taxFee;
    }
      
    function setCommunityFeePercent(uint256 CommunityFee) external onlyOwner() {
        _communityFee = CommunityFee;
    }

    function setMaxTxAmount(uint256 maxTxAmount) external onlyOwner() {
        _maxTxAmount = maxTxAmount;
    }
    
    function setCommunityWallet(address _address) public onlyOwner {
        communityAddress = _address;
    }

    function setTradingStartTime(uint256 newStartTime) public onlyOwner {
       require(tradingStartTime > block.timestamp, "Trading has already started");
       require(newStartTime > block.timestamp, "Start time must be in the future");
       tradingStartTime = newStartTime;
    }
    
     //to recieve ETH from uniswapV2Router when swaping
    receive() external payable {}
}

// contract Deploy {
//     MatrixSamurai public token;
    
//     constructor () public {
//         token = new MatrixSamurai();
        
//         token.transfer(0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2, 200000000 * 10 ** 18);
//         token.transfer(0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c, 200000000 * 10 ** 18);
//         token.transfer(0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db, 200000000 * 10 ** 18);
//         token.transfer(0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB, 200000000 * 10 ** 18);
//         token.transfer(0x617F2E2fD72FD9D5503197092aC168c91465E7f2, 200000000 * 10 ** 18);
        
//         token.transferOwnership(msg.sender);
// // community 0xdD870fA1b7C4700F2BD7f44238821C26f7392148
//     }
// }