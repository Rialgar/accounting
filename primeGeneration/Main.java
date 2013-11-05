import java.math.*;
import java.util.Random;

public class Main {

public static void main(String[] args) {

        // create 3 BigInteger objects
		BigInteger p, n, two;
		Random r = new Random();

		p = new BigInteger("4");
		n = new BigInteger("4");
		two = new BigInteger("2");

		while(!n.isProbablePrime(100))
		{
			p = BigInteger.probablePrime(512, r);
			n = p.multiply(two).add(BigInteger.ONE);
			System.out.print(".");
		}

		System.out.println(".");
		System.out.println(p.toString(16));
		System.out.println(n.toString(16));

    }
}